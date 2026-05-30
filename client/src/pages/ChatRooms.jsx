import React, { useState, useEffect, useRef, useContext } from 'react';
import { SocketContext, AuthContext } from '../App.jsx';
import { Hash, Send, Users, Sparkles, Terminal, Bell } from 'lucide-react';

export default function ChatRooms() {
  const socket = useContext(SocketContext);
  const { user, token, onlineUsers } = useContext(AuthContext);

  const [activeChannel, setActiveChannel] = useState('#general');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const channelsList = ['#general', '#dev-talk', '#announcements', '#help-desk'];

  // Scroll to the bottom of the message logs container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch channel message history on active channel change
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`/api/messages/${encodeURIComponent(activeChannel)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          setMessages(result.data);
        }
      } catch (err) {
        console.error('Failed to load message history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeChannel]);

  // 2. Setup socket room connections
  useEffect(() => {
    if (!socket) return;

    // Join room
    socket.emit('join_channel', activeChannel);

    // Socket Event: Message Received
    socket.on('receive_msg', (msg) => {
      if (msg.channel === activeChannel) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Socket Event: Typing Indicator Received
    socket.on('typing_status', ({ username, isTyping }) => {
      if (isTyping) {
        setTypingUser(username);
      } else {
        setTypingUser('');
      }
    });

    return () => {
      socket.emit('leave_channel', activeChannel);
      socket.off('receive_msg');
      socket.off('typing_status');
    };
  }, [socket, activeChannel]);

  // 3. Scroll to bottom whenever messages list state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // Handle Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    // Emit send_msg
    socket.emit('send_msg', {
      channel: activeChannel,
      text: inputText,
    });

    // Clear local inputs and reset typing states
    setInputText('');
    socket.emit('typing', { channel: activeChannel, isTyping: false });
  };

  // Handle user inputs (Typing indicators)
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket) return;

    // Emit typing indicator (true)
    socket.emit('typing', { channel: activeChannel, isTyping: true });

    // Clear previous timeout and set 1.5s idle wait to emit false
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { channel: activeChannel, isTyping: false });
    }, 1500);
  };

  return (
    <div className="glow-card rounded-2xl border border-brand-border/60 overflow-hidden shadow-2xl h-[78vh] flex">
      {/* Workspace Panel 1: Channels Sidebar List */}
      <div className="w-1/4 bg-slate-900/50 border-r border-brand-border flex flex-col justify-between hidden md:flex shrink-0">
        <div className="p-4 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-border/40">
            <div className="p-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Workspace Rooms
            </span>
          </div>

          <div className="space-y-1.5">
            {channelsList.map((channel) => (
              <button
                key={channel}
                onClick={() => {
                  setTypingUser('');
                  setActiveChannel(channel);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all ${
                  activeChannel === channel
                    ? 'bg-brand-accent/20 border-brand-accent/40 text-brand-text'
                    : 'bg-transparent border-transparent text-brand-muted hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <Hash className={`w-3.5 h-3.5 ${activeChannel === channel ? 'text-brand-accent' : ''}`} />
                <span>{channel.replace('#', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Floating workspace meta */}
        <div className="p-4 bg-slate-950/20 border-t border-brand-border/30">
          <div className="flex items-center gap-2 text-[10px] text-brand-muted font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
            Socket Gateway humming
          </div>
        </div>
      </div>

      {/* Workspace Panel 2: Live Message Stream Grid */}
      <div className="flex-1 flex flex-col justify-between bg-slate-950/10 min-w-0">
        {/* Chat header details */}
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-slate-900/20">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-brand-accent shrink-0" />
            <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              {activeChannel.replace('#', '')} Workspace
            </h2>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <select
              value={activeChannel}
              onChange={(e) => setActiveChannel(e.target.value)}
              className="text-xs bg-slate-850 border border-slate-700 rounded-lg p-1.5 focus:outline-none focus:border-brand-accent"
            >
              {channelsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scroll list log stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingHistory ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-brand-muted mt-2">Connecting history logs...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-8">
              <Hash className="w-10 h-10 text-brand-muted/70 mb-3 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Start of #{activeChannel.replace('#', '')}
              </h4>
              <p className="text-[10px] text-brand-muted mt-1.5">
                This marks the absolute beginning of real-time records in this room.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender?._id === user?._id || m.sender === user?._id;
              const formattedTime = new Date(m.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={m._id} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  <img
                    src={m.sender?.avatar}
                    alt={m.sender?.username}
                    className="w-8.5 h-8.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0"
                  />
                  <div>
                    {/* Message Bubble header */}
                    <div className={`flex items-center gap-1.5 text-[10px] text-brand-muted mb-1 ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-extrabold text-slate-300">{m.sender?.username || 'deleted_user'}</span>
                      <span>•</span>
                      <span>{formattedTime}</span>
                    </div>

                    {/* Chat text body */}
                    <div
                      className={`p-3 text-xs leading-relaxed ${
                        isMe
                          ? 'rounded-2xl rounded-tr-none bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md'
                          : 'rounded-2xl rounded-tl-none bg-slate-800/80 border border-slate-800 text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator Container Overlay */}
          {typingUser && (
            <div className="flex items-center gap-1.5 text-[10px] text-brand-cyan mt-1.5 pl-1 italic">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
              <span>{typingUser} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Form message input entry */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-brand-border/60 bg-slate-900/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Message ${activeChannel}...`}
              className="flex-1 text-xs px-4 py-3 rounded-xl bg-slate-800/35 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 rounded-xl bg-brand-accent text-white hover:bg-opacity-95 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Workspace Panel 3: Right Sidebar Online Users (Presence Sidebar) */}
      <div className="w-1/5 bg-slate-900/30 border-l border-brand-border flex flex-col hidden lg:flex shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-brand-border">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Channel Members
          </span>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {onlineUsers.length === 0 ? (
            <p className="text-center text-[10px] text-brand-muted py-2">Offline workspace</p>
          ) : (
            onlineUsers.map((online) => (
              <div key={online.userId} className="flex items-center gap-2 group">
                <img
                  src={online.avatar}
                  alt={online.username}
                  className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-brand-cyan transition-colors">
                    {online.username}
                  </p>
                  <p className="text-[9px] text-brand-muted capitalize leading-none mt-0.5">
                    {online.role}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
