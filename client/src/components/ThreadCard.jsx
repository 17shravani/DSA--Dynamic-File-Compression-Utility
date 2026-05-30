import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { AuthContext } from '../App.jsx';

export default function ThreadCard({ thread, onVote, onDelete }) {
  const { user } = useContext(AuthContext);

  // Check if current user voted up or down
  const userVote = thread.votes?.find((v) => v.user?._id === user?._id || v.user === user?._id);
  const isUpvoted = userVote?.voteType === 'up';
  const isDownvoted = userVote?.voteType === 'down';

  const canDelete =
    user &&
    (thread.author?._id === user?._id ||
      thread.author === user?._id ||
      user.role === 'admin' ||
      user.role === 'moderator');

  const formattedDate = new Date(thread.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="glow-card rounded-2xl p-5 hover:border-slate-600/80 transition-all duration-300 shadow-md flex gap-4">
      {/* Vote Panel */}
      <div className="flex flex-col items-center justify-start gap-1 p-1.5 rounded-xl bg-slate-800/30 border border-slate-800/60 h-fit">
        <button
          onClick={() => onVote(thread._id, 'up')}
          className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition-all ${
            isUpvoted ? 'text-emerald-400 bg-slate-800' : 'text-brand-muted'
          }`}
          title="Upvote"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <span className={`text-xs font-bold ${thread.voteScore > 0 ? 'text-emerald-400' : thread.voteScore < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
          {thread.voteScore}
        </span>
        <button
          onClick={() => onVote(thread._id, 'down')}
          className={`p-1.5 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition-all ${
            isDownvoted ? 'text-rose-400 bg-slate-800' : 'text-brand-muted'
          }`}
          title="Downvote"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          {/* Title and details */}
          <div>
            <Link to={`/thread/${thread._id}`} className="group block">
              <h2 className="text-lg font-bold text-slate-100 group-hover:text-brand-accent transition-colors duration-200 leading-tight">
                {thread.title}
              </h2>
            </Link>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-brand-muted mt-2">
              <div className="flex items-center gap-1.5">
                <img
                  src={thread.author?.avatar}
                  alt={thread.author?.username}
                  className="w-4 h-4 rounded-full bg-slate-700"
                />
                <span className="font-semibold text-slate-300">{thread.author?.username || 'deleted_user'}</span>
              </div>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Delete Action button */}
          {canDelete && (
            <button
              onClick={() => onDelete(thread._id)}
              className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-all self-start"
              title="Delete thread"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Snippet */}
        <p className="text-sm text-brand-muted mt-3 line-clamp-2 leading-relaxed">
          {thread.content}
        </p>

        {/* Footer info (Tags & comments count) */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-brand-border/40">
          <div className="flex flex-wrap gap-1.5">
            {thread.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-medium text-purple-300 hover:bg-brand-accent/20 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>

          <Link
            to={`/thread/${thread._id}`}
            className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{thread.commentCount} comments</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
