import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import { PenTool, ArrowLeft, Terminal, AlertTriangle } from 'lucide-react';

export default function CreateThread() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      setError('Please provide a title and specify the content of your thread');
      return;
    }

    if (formData.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }

    if (formData.content.length < 10) {
      setError('Discussion content must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/discussions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        navigate(`/thread/${result.data._id}`);
      } else {
        setError(result.message || 'Failed to create discussion');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Return Navigation */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Forums Feed
      </button>

      {/* Main card editor */}
      <div className="glow-card rounded-2xl p-6 md:p-8 border border-brand-border/60">
        <div className="flex items-center gap-3 border-b border-brand-border pb-4 mb-6">
          <div className="p-2.5 rounded-xl bg-brand-accent/20 text-brand-accent">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Ignite a Discussion</h1>
            <p className="text-xs text-brand-muted mt-0.5">
              Share details, ask questions, or propose architectural designs to the community.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Discussion Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Best practices for scaling Socket.io rooms with Redis Pub/Sub adapters?"
              className="w-full text-xs px-4 py-3.5 rounded-xl bg-slate-800/40 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
              required
            />
          </div>

          {/* Tags Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Topic Tags (Comma-separated)</label>
            <div className="relative">
              <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="socketio, redis, architecture, scale"
                className="w-full text-xs pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/40 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
              />
            </div>
            <p className="text-[10px] text-brand-muted">
              Separate your tags with commas to enable search indexes.
            </p>
          </div>

          {/* Content Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Thread Details *</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Provide a detailed explanation of your topic, outline the issues, and paste code snippets where appropriate..."
              rows="8"
              className="w-full text-xs px-4 py-3.5 rounded-xl bg-slate-800/40 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all leading-relaxed"
              required
            ></textarea>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-brand-border/40">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white glow-btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Publish Thread'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
