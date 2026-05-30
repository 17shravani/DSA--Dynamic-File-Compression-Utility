import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateThread from './pages/CreateThread.jsx';
import ThreadDetail from './pages/ThreadDetail.jsx';
import ChatRooms from './pages/ChatRooms.jsx';

// Components
import Navbar from './components/Navbar.jsx';

// Create Global Contexts
export const AuthContext = createContext(null);
export const SocketContext = createContext(null);

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Load User profile on initial boot or token change
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (result.success) {
          setUser(result.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Handle Socket connection based on Auth status
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to backend socket server
    const newSocket = io(window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : window.location.origin, {
      auth: { token },
    });

    setSocket(newSocket);

    // Socket listeners for presence & global events
    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to gateway!');
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('receive_msg', (msg) => {
      // Trigger a visual notification if the user is not in the chat page
      if (window.location.pathname !== '/chat') {
        const notifyMsg = {
          id: Date.now(),
          title: `New message in ${msg.channel}`,
          description: `${msg.sender.username}: "${msg.text.substring(0, 30)}${msg.text.length > 30 ? '...' : ''}"`,
          type: 'chat',
        };
        setNotifications((prev) => [notifyMsg, ...prev].slice(0, 10)); // Keep max 10 notifications
      }
    });

    newSocket.on('error_status', (err) => {
      console.error('Socket error received:', err);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const login = (jwtToken, userData) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setOnlineUsers([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg">
        <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-brand-muted text-sm tracking-wide">Initializing PulseNet intelligence engine...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, onlineUsers, notifications, setNotifications }}>
      <SocketContext.Provider value={socket}>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#f8fafc]">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
              <Routes>
                {/* Public Access */}
                <Route
                  path="/login"
                  element={user ? <Navigate to="/" /> : <Login />}
                />
                <Route
                  path="/register"
                  element={user ? <Navigate to="/" /> : <Register />}
                />

                {/* Discussions Feed (Public Read / Protected Write) */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/thread/:id" element={<ThreadDetail />} />

                {/* Authenticated Workspace Pages */}
                <Route
                  path="/create-thread"
                  element={user ? <CreateThread /> : <Navigate to="/login" />}
                />
                <Route
                  path="/chat"
                  element={user ? <ChatRooms /> : <Navigate to="/login" />}
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </Router>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}
