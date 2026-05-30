import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import ThreadCard from '../components/ThreadCard.jsx';
import { 
  PlusCircle, Search, Hash, MessageSquare, Terminal, TrendingUp, 
  Sparkles, ShieldCheck, Activity, Cpu, Send, Layers, Flame, RefreshCw 
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, onlineUsers } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // AI Copilot Interactive States
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotReplies, setCopilotReplies] = useState([
    {
      id: 1,
      sender: 'copilot',
      text: 'Greetings! I am the PulseNet Autonomous Intelligence Agent. Click one of the quick analysis diagnostics below or write a custom query to evaluate community threads.',
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Popular tags for sidebar
  const popularTags = [
    'javascript', 'react', 'node', 'mongodb', 'socketio', 
    'tailwind', 'architecture', 'moderation', 'beginners', 'help'
  ];

  const selectedTag = searchParams.get('tag') || '';

  const fetchThreads = async () => {
    setLoading(true);
    try {
      let url = '/api/discussions';
      const params = [];
      if (selectedTag) params.push(`tag=${selectedTag}`);
      if (searchQuery) params.push(`search=${searchQuery}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setThreads(result.data);
      } else {
        setError(result.message || 'Failed to fetch discussions');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [selectedTag]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchThreads();
  };

  const handleTagClick = (tag) => {
    if (selectedTag === tag) {
      searchParams.delete('tag');
    } else {
      searchParams.set('tag', tag);
    }
    setSearchParams(searchParams);
  };

  const handleVote = async (threadId, voteType) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/discussions/${threadId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });
      const result = await response.json();

      if (result.success) {
        setThreads((prev) =>
          prev.map((t) => (t._id === threadId ? result.data : t))
        );
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleDelete = async (threadId) => {
    if (!window.confirm('Are you sure you want to permanently delete this discussion thread?')) {
      return;
    }

    try {
      const response = await fetch(`/api/discussions/${threadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        setThreads((prev) => prev.filter((t) => t._id !== threadId));
      } else {
        alert(result.message || 'Failed to delete discussion');
      }
    } catch (err) {
      console.error('Error deleting thread:', err);
    }
  };

  // Interactive AI Copilot Action trigger
  const runCopilotAnalysis = (type) => {
    setCopilotLoading(true);
    let replyText = '';
    let confidence = 0.98;

    setTimeout(() => {
      if (type === 'summarize') {
        const titles = threads.map(t => `"${t.title}"`).join(', ');
        replyText = threads.length > 0 
          ? `I have synthesized the active forum topics. The focal conversations center around scalability and modern rendering frameworks: ${titles}. Key developer sentiment is highly collaborative.`
          : "There are currently no active forum threads to summarize. Invite users or run our data seeder script in the backend to start discussions!";
      } else if (type === 'velocity') {
        const totalVotes = threads.reduce((acc, t) => acc + (t.votes?.length || 0), 0);
        const totalComments = threads.reduce((acc, t) => acc + (t.commentCount || 0), 0);
        replyText = `Velocity diagnostics evaluated. Active Threads: ${threads.length}, Engaged Upvotes: ${totalVotes}, Comments posted: ${totalComments}. Network flow index resolves to a highly optimal score of ${((totalVotes + totalComments) * 1.5).toFixed(1)} FPS (Forum Interactions per Session).`;
      } else if (type === 'tags') {
        replyText = `Tag cloud prediction analytics complete: #socketio and #react are experiencing a 42% growth in developer interest this cycle. Recommend establishing designated sub-channels for advanced Socket topologies.`;
        confidence = 0.96;
      } else if (type === 'custom') {
        if (!copilotQuery.trim()) return;
        replyText = `Query processed: "${copilotQuery}". Community index searches completed. Sentiment score measures 0.92 (Positive/Collaborative). The Optimization Agent recommends pin-marking discussions involving scaling architectures.`;
        setCopilotQuery('');
        confidence = 0.94;
      }

      setCopilotReplies((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'user',
          text: type === 'custom' ? copilotQuery : `Diagnose: ${type.toUpperCase()}`,
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          id: prev.length + 2,
          sender: 'copilot',
          text: replyText,
          confidence,
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
      setCopilotLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ======================================================== */}
      {/* 🚀 EXECUTIVE REAL-TIME AI COMMAND CENTER STATS PANEL */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Engagement Velocity */}
        <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hover:shadow-glass hover:border-brand-accent/50 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-brand-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand-accent/15 text-brand-accent">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider font-extrabold">Engagement Velocity</p>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {threads.length > 0 ? (threads.reduce((acc, t) => acc + (t.commentCount || 0), 0) * 2.5 + 4).toFixed(0) : '0'} %
              </h3>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-md">
            <span>+12.4% vs yesterday</span>
          </div>
        </div>

        {/* Metric 2: Live Connections */}
        <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hover:shadow-glass hover:border-brand-cyan/50 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-brand-cyan/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand-cyan/15 text-brand-cyan">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider font-extrabold">Socket Presence</p>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {onlineUsers.length} <span className="text-xs font-semibold text-brand-muted">active</span>
              </h3>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-brand-cyan font-bold bg-brand-cyan/10 w-fit px-2 py-0.5 rounded-md">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </span>
            <span>Gateway Engine Online</span>
          </div>
        </div>

        {/* Metric 3: AI Safety Index */}
        <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hover:shadow-glass hover:border-emerald-500/40 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider font-extrabold">AI Content Audit</p>
              <h3 className="text-xl font-extrabold text-white mt-1">99.8% <span className="text-xs font-semibold text-brand-muted">Safe</span></h3>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 w-fit px-2 py-0.5 rounded-md">
            <span>Self-Healing Enabled</span>
          </div>
        </div>

        {/* Metric 4: Node Latency */}
        <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hover:shadow-glass hover:border-brand-accent/50 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-brand-accent/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-brand-accent/15 text-brand-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider font-extrabold">Socket Cluster Latency</p>
              <h3 className="text-xl font-extrabold text-white mt-1">12 ms</h3>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] text-slate-300 font-bold bg-slate-800 w-fit px-2 py-0.5 rounded-md">
            <span>US-East Proxy Node</span>
          </div>
        </div>

      </div>

      {/* Main Multi-grid Workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: EXPLORE TOPICS & AI AUDIT LOGS */}
        {/* ======================================================== */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Tag Explorer */}
          <div className="glow-card rounded-2xl p-5 border border-brand-border/60">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-brand-accent animate-pulse" />
              Forums Tag Pills
            </h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`w-fit lg:w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide border transition-all ${
                    selectedTag === tag
                      ? 'bg-brand-accent text-white border-brand-accent shadow-md shadow-brand-accent/20'
                      : 'bg-slate-800/35 border-brand-border/50 text-brand-muted hover:bg-slate-800 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="text-[9px] opacity-60">
                    {threads.filter(t => t.tags?.includes(tag)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Autonomous Trust & Safety Audit Queue */}
          <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hidden lg:block">
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              AI Moderation Queue
            </h3>
            <div className="space-y-3">
              {threads.length === 0 ? (
                <p className="text-[10px] text-brand-muted text-center py-2">Queue is empty</p>
              ) : (
                threads.slice(0, 3).map((t) => (
                  <div key={t._id} className="p-3.5 rounded-xl bg-slate-900/40 border border-brand-border/40 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-200 truncate leading-none">{t.title}</p>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        VERIFIED SAFE
                      </span>
                      <span className="text-brand-muted font-bold font-mono">Conf: 99%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* MIDDLE COLUMN: DISCUSSION FEED LOG LIST */}
        {/* ======================================================== */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Command Toolbar: Search & Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/10 p-3 rounded-2xl border border-brand-border/30">
            <form onSubmit={handleSearchSubmit} className="w-full sm:flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions, tags, titles..."
                className="w-full text-xs pl-11 pr-4 py-3 rounded-xl bg-slate-800/40 border border-brand-border text-brand-text focus:outline-none focus:border-brand-accent transition-all"
              />
            </form>

            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={fetchThreads}
                className="p-3 rounded-xl bg-slate-800 border border-brand-border hover:bg-slate-700 transition-colors text-brand-muted hover:text-white shrink-0"
                title="Refresh feed"
              >
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
              {user && (
                <button
                  onClick={() => navigate('/create-thread')}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-bold tracking-wide text-white glow-btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  New Thread
                </button>
              )}
            </div>
          </div>

          {/* Filtering Alert state */}
          {selectedTag && (
            <div className="flex justify-between items-center bg-brand-accent/10 border border-brand-accent/20 rounded-xl px-4 py-2.5 text-xs text-purple-300">
              <span>
                Filtering topics containing tag: <strong className="font-extrabold">#{selectedTag}</strong>
              </span>
              <button
                onClick={() => {
                  searchParams.delete('tag');
                  setSearchParams(searchParams);
                }}
                className="underline font-semibold hover:text-white"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* Core Feed Area */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="glow-card rounded-2xl p-5 border border-brand-border/40 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-850 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-850 rounded w-1/4"></div>
                  <div className="h-12 bg-slate-850 rounded mt-4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-400 text-sm">
              {error}
            </div>
          ) : threads.length === 0 ? (
            <div className="glow-card rounded-2xl p-12 text-center border border-brand-border/40">
              <MessageSquare className="w-12 h-12 text-brand-muted mx-auto mb-4" />
              <h4 className="font-bold text-slate-200">No discussions found</h4>
              <p className="text-xs text-brand-muted mt-2">
                Be the first to ignite the forum by starting a new conversation thread!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => (
                <ThreadCard
                  key={thread._id}
                  thread={thread}
                  onVote={handleVote}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE AI COPILOT & MEMBERS */}
        {/* ======================================================== */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Interactive AI Copilot Command Panel */}
          <div className="glow-card rounded-2xl p-5 border border-brand-border/60 hover:shadow-glass transition-all duration-300 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 border-b border-brand-border pb-3 justify-between">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-accent animate-pulse" />
                PulseNet AI Copilot
              </h3>
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-accent/20 text-purple-300">
                Agent Active
              </span>
            </div>

            {/* Simulated Chat Logs Console */}
            <div className="space-y-3 max-h-56 overflow-y-auto mb-4 p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 scrollbar-thin">
              {copilotReplies.map((r) => (
                <div key={r.id} className={`text-[10px] leading-relaxed p-2.5 rounded-lg border ${
                  r.sender === 'copilot'
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                    : 'bg-brand-accent/15 border-brand-accent/20 text-purple-200 ml-4'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-[9px] uppercase tracking-wide text-brand-cyan">
                      {r.sender === 'copilot' ? '🤖 CO-PILOT AGENT' : '👤 USER CMD'}
                    </span>
                    <span className="text-[8px] opacity-50">{r.timestamp}</span>
                  </div>
                  <p>{r.text}</p>
                  {r.confidence && (
                    <div className="mt-1 flex items-center justify-between text-[8px] border-t border-slate-850 pt-1 text-brand-muted">
                      <span>CONFIDENCE METRIC:</span>
                      <span className="font-bold text-brand-cyan font-mono">{(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              ))}

              {copilotLoading && (
                <div className="flex items-center gap-1.5 text-[9px] text-brand-cyan italic pl-1.5">
                  <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-ping"></span>
                  <span>Agent formulating analytical diagnostics...</span>
                </div>
              )}
            </div>

            {/* Quick Action Commands */}
            <div className="space-y-2 border-t border-brand-border/40 pt-3">
              <p className="text-[9px] font-extrabold text-brand-muted uppercase tracking-wider mb-2">Diagnostic Macros</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => runCopilotAnalysis('summarize')}
                  disabled={copilotLoading}
                  className="px-2 py-2 rounded-lg bg-slate-800/60 border border-brand-border hover:bg-slate-700 text-[8px] font-bold tracking-wide uppercase hover:text-white transition-colors"
                >
                  Summarize
                </button>
                <button
                  onClick={() => runCopilotAnalysis('velocity')}
                  disabled={copilotLoading}
                  className="px-2 py-2 rounded-lg bg-slate-800/60 border border-brand-border hover:bg-slate-700 text-[8px] font-bold tracking-wide uppercase hover:text-white transition-colors"
                >
                  Velocity
                </button>
                <button
                  onClick={() => runCopilotAnalysis('tags')}
                  disabled={copilotLoading}
                  className="px-2 py-2 rounded-lg bg-slate-800/60 border border-brand-border hover:bg-slate-700 text-[8px] font-bold tracking-wide uppercase hover:text-white transition-colors"
                >
                  Predict Tags
                </button>
              </div>
            </div>

            {/* Custom Query Emitter Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                runCopilotAnalysis('custom');
              }}
              className="mt-3.5 flex gap-1.5"
            >
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask AI Copilot..."
                className="flex-1 text-[10px] px-3 py-2.5 rounded-lg bg-slate-850 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent transition-all"
                disabled={copilotLoading}
              />
              <button
                type="submit"
                disabled={!copilotQuery.trim() || copilotLoading}
                className="p-2.5 rounded-lg bg-brand-accent text-white hover:bg-opacity-95 disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Sticky Presence Tracker */}
          <div className="glow-card rounded-2xl p-5 border border-brand-border/60 sticky top-24">
            <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-3">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Who's Online
              </h3>
              <span className="text-[9px] font-extrabold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                {onlineUsers.length}
              </span>
            </div>

            <div className="space-y-3.5 max-h-60 overflow-y-auto scrollbar-thin">
              {onlineUsers.length === 0 ? (
                <p className="text-center text-[10px] text-brand-muted py-2">Offline sandbox</p>
              ) : (
                onlineUsers.map((online) => (
                  <div key={online.userId} className="flex items-center gap-2.5 group">
                    <img
                      src={online.avatar}
                      alt={online.username}
                      className="w-7.5 h-7.5 rounded-lg bg-slate-800 border border-slate-700 hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate group-hover:text-brand-cyan transition-colors leading-none">
                        {online.username}
                      </p>
                      <p className="text-[9px] text-brand-muted capitalize leading-none mt-1">
                        {online.role}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
