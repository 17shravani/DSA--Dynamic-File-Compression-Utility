import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import CommentSection from '../components/CommentSection.jsx';
import { ArrowLeft, MessageSquare, ArrowUp, ArrowDown, Calendar, Tag, User } from 'lucide-react';

export default function ThreadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch thread details and comments
  const fetchThreadData = async () => {
    try {
      const threadRes = await fetch(`/api/discussions/${id}`);
      const threadData = await threadRes.json();

      if (!threadData.success) {
        setError(threadData.message || 'Discussion thread not found');
        setLoading(false);
        return;
      }

      setThread(threadData.data);

      const commentsRes = await fetch(`/api/comments/discussion/${id}`);
      const commentsData = await commentsRes.json();

      if (commentsData.success) {
        setComments(commentsData.data);
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreadData();
  }, [id]);

  const handleVote = async (voteType) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/discussions/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });
      const result = await response.json();

      if (result.success) {
        setThread(result.data);
      }
    } catch (err) {
      console.error('Error voting on thread:', err);
    }
  };

  const handleAddComment = async (content, parentId = null) => {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          discussionId: id,
          parentId,
        }),
      });
      const result = await response.json();

      if (result.success) {
        // Add new comment to state and increment local count
        setComments((prev) => [...prev, result.data]);
        setThread((prev) => ({
          ...prev,
          commentCount: prev.commentCount + 1,
        }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleVoteComment = async (commentId, voteType) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });
      const result = await response.json();

      if (result.success) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? result.data : c))
        );
      }
    } catch (err) {
      console.error('Error voting comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment permanently?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        // Filter out from local state and update local thread count
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        setThread((prev) => ({
          ...prev,
          commentCount: prev.commentCount - 1,
        }));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-brand-muted text-xs">Rehydrating forum nodes...</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error || 'Thread not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const userVote = thread.votes?.find((v) => v.user?._id === user?._id || v.user === user?._id);
  const isUpvoted = userVote?.voteType === 'up';
  const isDownvoted = userVote?.voteType === 'down';

  const formattedDate = new Date(thread.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Forums Feed
      </button>

      {/* Main Discussion Thread Container */}
      <div className="glow-card rounded-2xl p-6 md:p-8 border border-brand-border/60">
        <div className="flex gap-5">
          {/* Thread Vote panel */}
          <div className="flex flex-col items-center justify-start gap-1 p-2 rounded-xl bg-slate-800/35 border border-slate-800/60 h-fit">
            <button
              onClick={() => handleVote('up')}
              className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition-all ${
                isUpvoted ? 'text-emerald-400 bg-slate-800' : 'text-brand-muted'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className={`text-xs font-bold ${thread.voteScore > 0 ? 'text-emerald-400' : thread.voteScore < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {thread.voteScore || 0}
            </span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition-all ${
                isDownvoted ? 'text-rose-400 bg-slate-800' : 'text-brand-muted'
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          {/* Thread content body */}
          <div className="flex-1 min-w-0 space-y-4">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 leading-tight outfit">
              {thread.title}
            </h1>

            {/* Author meta row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pb-4 border-b border-brand-border/40 text-xs text-brand-muted">
              <div className="flex items-center gap-2">
                <img
                  src={thread.author?.avatar}
                  alt={thread.author?.username}
                  className="w-5 h-5 rounded-full bg-slate-800"
                />
                <span className="font-semibold text-slate-200">{thread.author?.username || 'deleted_user'}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-brand-accent uppercase font-bold tracking-wider">
                  {thread.author?.role}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{thread.commentCount} comments</span>
              </div>
            </div>

            {/* Full Content Text */}
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line pt-2 font-sans">
              {thread.content}
            </div>

            {/* Tag Pills */}
            <div className="flex flex-wrap gap-2 pt-4">
              {thread.tags?.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-xs font-semibold text-purple-300"
                >
                  <Tag className="w-3 h-3 text-brand-accent" />
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Author Bio Panel */}
        {thread.author?.bio && (
          <div className="mt-8 p-4 rounded-xl bg-slate-800/15 border border-slate-800/50 flex gap-3.5 items-center">
            <div className="p-2 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-extrabold leading-none">
                About The Author
              </p>
              <p className="text-xs text-slate-300 mt-1 italic leading-tight">
                "{thread.author.bio}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Discussion comments area */}
      <div className="glow-card rounded-2xl p-6 md:p-8 border border-brand-border/60">
        <CommentSection
          comments={comments}
          onAddComment={handleAddComment}
          onVoteComment={handleVoteComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>
    </div>
  );
}
