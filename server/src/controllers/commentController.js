import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Discussion from '../models/Discussion.js';

// ==========================================
// 💬 MEMORY SANDBOX FALLBACK COMMENT CACHE
// ==========================================
let mockComments = [
  {
    _id: "6658091f802ea7945d8b8b10",
    content: "Excellent topic, Alice! I dealt with this during a recent platform launch.\n\nWe scaled to 50k concurrent sockets using AWS ElastiCache Redis. One key recommendation is to ensure you monitor your Redis replication lag. Also, definitely configure a rate-limiter on client emitters before they broadcast to busy rooms.",
    discussion: "6658091f802ea7945d8b8b01",
    author: {
      _id: "6658091f802ea7945d8b8b03",
      username: "coder_bob",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=coder_bob",
      role: "user"
    },
    parentId: null,
    votes: [],
    voteScore: 5,
    createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    _id: "6658091f802ea7945d8b8b11",
    content: "Thanks for the insights, Bob!\n\nDid you notice any major latency spikes when scaling connection groups on AWS ElastiCache? Also, did you deploy Redis in a clustered configuration or was a single primary node sufficient?",
    discussion: "6658091f802ea7945d8b8b01",
    author: {
      _id: "6658091f802ea7945d8b8b00",
      username: "developer_alice",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=developer_alice",
      role: "admin"
    },
    parentId: "6658091f802ea7945d8b8b10", // Child of Bob's comment
    votes: [],
    voteScore: 2,
    createdAt: new Date(Date.now() - 1800000).toISOString() // 30 mins ago
  },
  {
    _id: "6658091f802ea7945d8b8b12",
    content: "This thread is an absolute goldmine. Pinning this to the sidebar for coding newcomers.",
    discussion: "6658091f802ea7945d8b8b01",
    author: {
      _id: "6658091f802ea7945d8b8b04",
      username: "moderator_charlie",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=moderator_charlie",
      role: "moderator"
    },
    parentId: null,
    votes: [],
    voteScore: 0,
    createdAt: new Date(Date.now() - 900000).toISOString() // 15 mins ago
  }
];

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all comments for a discussion
// @route   GET /api/comments/discussion/:discussionId
// @access  Public
export const getCommentsByDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      console.log('⚠️  Serving comments from Memory Sandbox fallback cache...');
      const filtered = mockComments.filter(c => c.discussion === discussionId);
      return res.json({ success: true, count: filtered.length, data: filtered });
    }

    // --- PRODUCTION DB MODE ---
    const comments = await Comment.find({ discussion: discussionId })
      .populate('author', 'username avatar role')
      .sort({ createdAt: 1 });

    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    console.error('Fetch Comments Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving comments' });
  }
};

// @desc    Create a new comment/reply
// @route   POST /api/comments
// @access  Private
export const createComment = async (req, res) => {
  try {
    const { content, discussionId, parentId } = req.body;

    if (!content || !discussionId) {
      return res.status(400).json({ success: false, message: 'Content and discussion ID are required' });
    }

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      const newComment = {
        _id: new mongoose.Types.ObjectId().toString(),
        content,
        discussion: discussionId,
        author: {
          _id: req.user ? req.user._id : "mock_user_id",
          username: req.user ? req.user.username : "anonymous_coder",
          avatar: req.user ? req.user.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous",
          role: req.user ? req.user.role : "user"
        },
        parentId: parentId || null,
        votes: [],
        voteScore: 0,
        createdAt: new Date().toISOString()
      };

      mockComments.push(newComment);
      return res.status(201).json({ success: true, data: newComment });
    }

    // --- PRODUCTION DB MODE ---
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion thread not found' });
    }

    const comment = await Comment.create({
      content,
      discussion: discussionId,
      author: req.user._id,
      parentId: parentId || null,
    });

    discussion.commentCount = discussion.commentCount + 1;
    await discussion.save();

    const populated = await Comment.findById(comment._id).populate('author', 'username avatar role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create Comment Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating comment' });
  }
};

// @desc    Vote on a comment
// @route   POST /api/comments/:id/vote
// @access  Private
export const voteComment = async (req, res) => {
  try {
    const { voteType } = req.body;
    const { id } = req.params;
    const userId = req.user ? req.user._id.toString() : "mock_user_id";

    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ success: false, message: 'Invalid vote type' });
    }

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      const commentIndex = mockComments.findIndex(c => c._id === id);
      if (commentIndex === -1) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      const comment = mockComments[commentIndex];
      const voteIndex = comment.votes.findIndex(v => v.user === userId);

      if (voteIndex > -1) {
        if (comment.votes[voteIndex].voteType === voteType) {
          comment.votes.splice(voteIndex, 1);
        } else {
          comment.votes[voteIndex].voteType = voteType;
        }
      } else {
        comment.votes.push({ user: userId, voteType });
      }

      comment.voteScore = comment.votes.reduce((acc, v) => acc + (v.voteType === 'up' ? 1 : -1), 0);
      const baseScore = id === "6658091f802ea7945d8b8b10" ? 5 : id === "6658091f802ea7945d8b8b11" ? 2 : 0;
      comment.voteScore += baseScore;

      return res.json({ success: true, data: comment });
    }

    // --- PRODUCTION DB MODE ---
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const existingVoteIndex = comment.votes.findIndex(
      (v) => v.user.toString() === userId.toString()
    );

    if (existingVoteIndex > -1) {
      if (comment.votes[existingVoteIndex].voteType === voteType) {
        comment.votes.splice(existingVoteIndex, 1);
      } else {
        comment.votes[existingVoteIndex].voteType = voteType;
      }
    } else {
      comment.votes.push({ user: req.user._id, voteType });
    }

    await comment.save();

    const updatedComment = await Comment.findById(id).populate('author', 'username avatar role');

    res.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Comment Vote Error:', error);
    res.status(500).json({ success: false, message: 'Server error voting' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      mockComments = mockComments.filter(c => c._id !== id);
      return res.json({ success: true, message: 'Comment deleted successfully from memory cache' });
    }

    // --- PRODUCTION DB MODE ---
    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    const discussionId = comment.discussion;
    await comment.deleteOne();
    await Discussion.findByIdAndUpdate(discussionId, { $inc: { commentCount: -1 } });

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete Comment Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting comment' });
  }
};
