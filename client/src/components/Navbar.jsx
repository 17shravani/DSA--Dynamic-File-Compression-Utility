import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import { MessageSquare, Bell, LogOut, LogIn, UserPlus, Users, Flame } from 'lucide-react';

export default function Navbar() {
  const { user, logout, onlineUsers, notifications, setNotifications } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-brand-bg/75 border-b border-brand-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 group-hover:rotate-12 transition-transform duration-300">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight outfit bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Dyna<span className="text-cyan-400">Compress</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'text-cyan-400' : 'text-brand-muted hover:text-white'
              }`}
            >
              Dashboard
            </Link>
          </div>

          {/* Right Action panel */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Online indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-brand-muted">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">{onlineUsers.length}</span> online
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg text-brand-muted hover:text-white hover:bg-slate-800 transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-accent border-2 border-brand-bg rounded-full"></span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 rounded-xl glow-card p-4 shadow-xl z-50 text-sm">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-brand-border">
                        <span className="font-bold">Notifications ({notifications.length})</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearNotifications}
                            className="text-xs text-brand-accent hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2.5">
                        {notifications.length === 0 ? (
                          <p className="text-brand-muted text-center py-4 text-xs">No new notifications</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                              <p className="font-semibold text-xs text-slate-200">{n.title}</p>
                              <p className="text-xs text-brand-muted mt-0.5">{n.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info & Avatar */}
                <div className="flex items-center gap-3 pl-2 border-l border-brand-border">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700"
                  />
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold leading-none text-slate-200">{user.username}</p>
                    <p className="text-[10px] text-brand-accent capitalize mt-0.5 leading-none">{user.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all ml-1"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg text-brand-muted hover:text-white transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-brand-accent text-white hover:bg-opacity-90 transition-all shadow-md shadow-brand-accent/20"
                >
                  <UserPlus className="w-4 h-4" />
                  Join Platform
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
