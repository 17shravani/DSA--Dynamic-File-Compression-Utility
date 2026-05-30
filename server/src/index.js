import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import discussionRoutes from './routes/discussionRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

// Import Sockets
import { setupSockets } from './sockets/chatSocket.js';

// Load Environment Variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);

// Root Ping Route
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'PulseNet API engine is humming along beautifully.',
    timestamp: new Date(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Configure Socket.io with Server & CORS
const io = new Server(server, {
  cors: corsOptions,
});

// Setup Sockets
setupSockets(io);

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulsenet';

console.log('🔄 Connecting to MongoDB...');
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('💚 Connected to MongoDB successfully!');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  PulseNet running in Database-Fallback Sandbox mode.');
  });

server.listen(PORT, () => {
  console.log(`🚀 PulseNet Server running in ${process.env.NODE_ENV || 'production'} mode on http://localhost:${PORT}`);
});
