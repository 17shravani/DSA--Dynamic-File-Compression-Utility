import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';

// In-memory tracker for connected users: { socketId: { userId, username, avatar } }
const connectedUsers = {};

export const setupSockets = (io) => {
  // Socket.io Middleware to authenticate connection with JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user object to socket
      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket Authentication Failed:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    
    // Register user in the online list
    connectedUsers[socket.id] = {
      userId: user._id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
    };

    console.log(`⚡ User Connected: ${user.username} (${socket.id})`);

    // Broadcast updated online users list
    sendOnlineUsersList(io);

    // Event: Join Channel Room
    socket.on('join_channel', (channel) => {
      socket.join(channel);
      console.log(`📡 Socket ${socket.id} (${user.username}) joined room: ${channel}`);
    });

    // Event: Leave Channel Room
    socket.on('leave_channel', (channel) => {
      socket.leave(channel);
      console.log(`🔌 Socket ${socket.id} (${user.username}) left room: ${channel}`);
    });

    // Event: Typing Indicator
    socket.on('typing', ({ channel, isTyping }) => {
      // Broadcast to other users in the room
      socket.to(channel).emit('typing_status', {
        username: user.username,
        isTyping,
      });
    });

    // Event: Send Message
    socket.on('send_msg', async ({ channel, text }) => {
      try {
        if (!text || !text.trim()) return;

        // Save message to MongoDB
        const newMessage = await Message.create({
          channel,
          sender: user._id,
          text,
        });

        // Populate sender before broadcasting
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username avatar role');

        // Broadcast to all sockets in the channel (including sender)
        io.to(channel).emit('receive_msg', populatedMessage);
      } catch (err) {
        console.error('Socket Message Save Error:', err);
        socket.emit('error_status', 'Failed to send message');
      }
    });

    // Event: Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User Disconnected: ${user.username} (${socket.id})`);
      
      // Remove from online list
      delete connectedUsers[socket.id];
      
      // Broadcast updated online users list
      sendOnlineUsersList(io);
    });
  });
};

// Helper function to extract unique online users and broadcast
const sendOnlineUsersList = (io) => {
  // Filter out duplicates (if same user is connected on multiple tabs/sockets)
  const uniqueUsers = {};
  Object.values(connectedUsers).forEach((u) => {
    uniqueUsers[u.userId.toString()] = u;
  });

  io.emit('online_users', Object.values(uniqueUsers));
};
