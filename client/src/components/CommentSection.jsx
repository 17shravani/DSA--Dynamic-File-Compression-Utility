import React, { useState, useContext } from 'react';
import { MessageSquare, ArrowUp, ArrowDown, Trash2, CornerDownRight } from 'lucide-react';
import { AuthContext } from '../App.jsx';

export default function CommentSection({ comments, onAddComment, onVoteComment, onDeleteComment }) {
  const { user } = useContext(AuthContext);
  const [commentText, setCommentText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText, null);
    setCommentText('');
  };

  const handleSubmitReply = (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAddComment(replyText, parentId);
    setReplyText('');
    setActiveReplyId(null);
  };

  // Group comments by their parentId to build a tree
  const rootComments = comments.filter((c) => !c.parentId);
  const getRepliesForComment = (commentId) => {
    return comments.filter((c) => c.parentId === commentId);
  };

  // Recursive Comment Node Component
  const CommentNode = ({ comment, depth = 0 }) => {
    const isReplying = activeReplyId === comment._id;
    const replies = getRepliesForComment(comment._id);

    const userVote = comment.votes?.find((v) => v.user === user?._id || v.user?._id === user?._id);
    const isUpvoted = userVote?.voteType === 'up';
    const isDownvoted = userVote?.voteType === 'down';

    const canDelete =
      user &&
      (comment.author?._id === user?._id ||
        comment.author === user?._id ||
        user.role === 'admin' ||
        user.role === 'moderator');

    const formattedDate = new Date(comment.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="space-y-3">
        {/* Individual Comment Card */}
        <div 
          className={`flex gap-3 p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 transition-all ${
            depth > 0 ? 'ml-6 border-l-2 border-l-brand-accent/30' : ''
          }`}
        >
          {/* Avatar column */}
          <img
            src={comment.author?.avatar}
            alt={comment.author?.username}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 h-fit"
          />

          {/* Core comment content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{comment.author?.username || 'deleted_user'}</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-brand-accent uppercase font-bold tracking-wider">
                  {comment.author?.role}
                </span>
              </div>
              <span className="text-[10px] text-brand-muted">{formattedDate}</span>
            </div>

            <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
              {comment.content}
            </p>

            {/* Comment actions (Upvote, downvote, reply toggle, delete) */}
            <div className="flex items-center gap-4 mt-3 text-xs text-brand-muted">
              {/* Upvote */}
              <div className="flex items-center gap-1 bg-slate-800/30 rounded-lg px-2 py-0.5 border border-slate-800/60">
                <button
                  onClick={() => onVoteComment(comment._id, 'up')}
                  className={`hover:text-emerald-400 transition-colors ${isUpvoted ? 'text-emerald-400' : ''}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <span className="font-bold text-[10px]">{comment.voteScore || 0}</span>
                <button
                  onClick={() => onVoteComment(comment._id, 'down')}
                  className={`hover:text-rose-400 transition-colors ${isDownvoted ? 'text-rose-400' : ''}`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Reply toggle */}
              {user && (
                <button
                  onClick={() => {
                    setActiveReplyId(isReplying ? null : comment._id);
                    setReplyText('');
                  }}
                  className="flex items-center gap-1 hover:text-brand-accent transition-colors"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              )}

              {/* Delete */}
              {canDelete && (
                <button
                  onClick={() => onDeleteComment(comment._id)}
                  className="flex items-center gap-1 text-rose-400/80 hover:text-rose-400 hover:underline transition-colors ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Nested Reply Form */}
            {isReplying && (
              <form
                onSubmit={(e) => handleSubmitReply(e, comment._id)}
                className="mt-3 flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author?.username}...`}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-800 border border-brand-border text-brand-text focus:outline-none focus:border-brand-accent transition-all"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-white hover:bg-opacity-90 transition-all"
                >
                  Reply
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Recursive rendering of child replies */}
        {replies.length > 0 && (
          <div className="space-y-3">
            {replies.map((reply) => (
              <CommentNode key={reply._id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-brand-border pb-3">
        <MessageSquare className="w-5 h-5 text-brand-accent" />
        <h3 className="font-bold text-slate-100">Discussion Comments ({comments.length})</h3>
      </div>

      {/* Add New Comment Box */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your insights on this topic..."
            rows="3"
            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-800/40 border border-brand-border text-brand-text placeholder-slate-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all leading-relaxed"
          ></textarea>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-brand-accent text-white hover:bg-opacity-90 transition-all shadow-md shadow-brand-accent/15"
            >
              Post Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-slate-800/25 border border-slate-800/60 text-center">
          <p className="text-sm text-brand-muted">
            You must be logged in to participate in the conversation.
          </p>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4 mt-6">
        {rootComments.length === 0 ? (
          <p className="text-center text-sm text-brand-muted py-6">
            No comments yet. Start the conversation!
          </p>
        ) : (
          rootComments.map((rootComment) => (
            <CommentNode key={rootComment._id} comment={rootComment} />
          ))
        )}
      </div>
    </div>
  );
}
