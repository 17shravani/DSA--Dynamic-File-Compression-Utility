import mongoose from 'mongoose';
import Discussion from '../models/Discussion.js';
import Comment from '../models/Comment.js';

// ==========================================
// 🧠 MEMORY SANDBOX FALLBACK DATA CACHE
// ==========================================
let mockDiscussions = [
  {
    _id: "6658091f802ea7945d8b8b01",
    title: "Best practices for scaling Socket.io rooms with Redis Pub/Sub adapters?",
    content: "Hey team! I am designing a real-time gateway that needs to support upwards of 100,000 concurrent socket connections.\n\nTo prevent memory leaks and handle high loads, I am clustering our Node.js gateway nodes behind an Nginx reverse proxy. I know that Socket.io relies on an in-memory adapter by default, which means connections on Node Server A cannot communicate with Server B.\n\nI am planning to use the `@socket.io/redis-adapter` to broadcast events across nodes. What are your experiences with Redis CPU load in production when handling massive room broadcast loops? Any buffer configurations or rate-limiting strategies you would recommend?",
    author: {
      _id: "6658091f802ea7945d8b8b00",
      username: "developer_alice",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=developer_alice",
      role: "admin",
      bio: "Principal Software Architect. Passionate about WebSockets, node.js clustering, and scalable distributed database topologies."
    },
    tags: ["socketio", "redis", "architecture", "node"],
    votes: [],
    voteScore: 42,
    commentCount: 3,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    _id: "6658091f802ea7945d8b8b02",
    title: "Why React 18 Concurrent Features and Server Components are a complete game-changer",
    content: "I've been upgrading some older dashboard apps to React 18 and utilizing concurrent rendering.\n\nThe UX improvements from useTransition and useDeferredValue are incredible. It allows complex filter listings to calculate in the background without freezing the input typing indicators.\n\nCombine that with NextJS App Router server components, and we get near-instant initial loads with practically zero client-side bundles! Would love to hear how other teams are structuring state management with nested folders.",
    author: {
      _id: "6658091f802ea7945d8b8b03",
      username: "coder_bob",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=coder_bob",
      role: "user",
      bio: "Frontend Engineer. Coding in React, experimenting with Framer Motion transitions, and crafting responsive Tailwind UI dashboards."
    },
    tags: ["react", "javascript", "tailwind"],
    votes: [],
    voteScore: 24,
    commentCount: 0,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
  }
];

// Helper to check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all discussions (with optional tag filter)
// @route   GET /api/discussions
// @access  Public
export const getDiscussions = async (req, res) => {
  try {
    const { tag, search } = req.query;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      console.log('⚠️  Serving discussions from Memory Sandbox fallback cache...');
      let filtered = [...mockDiscussions];
      
      if (tag) {
        filtered = filtered.filter(t => t.tags.includes(tag.toLowerCase()));
      }
      
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(t => 
          t.title.toLowerCase().includes(query) || 
          t.content.toLowerCase().includes(query)
        );
      }
      
      return res.json({ success: true, count: filtered.length, data: filtered });
    }

    // --- PRODUCTION DB MODE ---
    let query = {};
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const discussions = await Discussion.find(query)
      .populate('author', 'username avatar role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: discussions.length, data: discussions });
  } catch (error) {
    console.error('Fetch Discussions Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving discussions' });
  }
};

// @desc    Get a single discussion details (populated)
// @route   GET /api/discussions/:id
// @access  Public
export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      const thread = mockDiscussions.find(t => t._id === id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Discussion not found' });
      }
      return res.json({ success: true, data: thread });
    }

    // --- PRODUCTION DB MODE ---
    const discussion = await Discussion.findById(id)
      .populate('author', 'username avatar role bio')
      .populate({
        path: 'votes.user',
        select: 'username',
      });

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    res.json({ success: true, data: discussion });
  } catch (error) {
    console.error('Fetch Discussion Details Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving discussion details' });
  }
};

// @desc    Create new discussion
// @route   POST /api/discussions
// @access  Private
export const createDiscussion = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const processedTags = tags
      ? tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      const newThread = {
        _id: new mongoose.Types.ObjectId().toString(),
        title,
        content,
        tags: processedTags,
        author: {
          _id: req.user ? req.user._id : "mock_user_id",
          username: req.user ? req.user.username : "anonymous_coder",
          avatar: req.user ? req.user.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous",
          role: req.user ? req.user.role : "user",
          bio: req.user ? req.user.bio : "Platform member."
        },
        votes: [],
        voteScore: 0,
        commentCount: 0,
        createdAt: new Date().toISOString()
      };
      
      mockDiscussions.unshift(newThread); // Add to memory
      return res.status(201).json({ success: true, data: newThread });
    }

    // --- PRODUCTION DB MODE ---
    const discussion = await Discussion.create({
      title,
      content,
      tags: processedTags,
      author: req.user._id,
    });

    const populated = await Discussion.findById(discussion._id).populate('author', 'username avatar role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create Discussion Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating discussion' });
  }
};

// @desc    Vote on a discussion (up/down)
// @route   POST /api/discussions/:id/vote
// @access  Private
export const voteDiscussion = async (req, res) => {
  try {
    const { voteType } = req.body;
    const { id } = req.params;
    const userId = req.user ? req.user._id.toString() : "mock_user_id";

    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ success: false, message: 'Invalid vote type' });
    }

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      const threadIndex = mockDiscussions.findIndex(t => t._id === id);
      if (threadIndex === -1) {
        return res.status(404).json({ success: false, message: 'Discussion not found' });
      }

      const thread = mockDiscussions[threadIndex];
      const voteIndex = thread.votes.findIndex(v => v.user === userId);

      if (voteIndex > -1) {
        if (thread.votes[voteIndex].voteType === voteType) {
          thread.votes.splice(voteIndex, 1);
        } else {
          thread.votes[voteIndex].voteType = voteType;
        }
      } else {
        thread.votes.push({ user: userId, voteType });
      }

      thread.voteScore = thread.votes.reduce((acc, v) => acc + (v.voteType === 'up' ? 1 : -1), 0);
      // Offset starting seed score
      const baseScore = id === "6658091f802ea7945d8b8b01" ? 42 : 24;
      thread.voteScore += baseScore;

      return res.json({ success: true, data: thread });
    }

    // --- PRODUCTION DB MODE ---
    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    const existingVoteIndex = discussion.votes.findIndex(
      (v) => v.user.toString() === userId.toString()
    );

    if (existingVoteIndex > -1) {
      if (discussion.votes[existingVoteIndex].voteType === voteType) {
        discussion.votes.splice(existingVoteIndex, 1);
      } else {
        discussion.votes[existingVoteIndex].voteType = voteType;
      }
    } else {
      discussion.votes.push({ user: req.user._id, voteType });
    }

    await discussion.save();
    
    const updatedDiscussion = await Discussion.findById(id)
      .populate('author', 'username avatar role')
      .populate({ path: 'votes.user', select: 'username' });

    res.json({ success: true, data: updatedDiscussion });
  } catch (error) {
    console.error('Vote Error:', error);
    res.status(500).json({ success: false, message: 'Server error voting' });
  }
};

// @desc    Delete a discussion
// @route   DELETE /api/discussions/:id
// @access  Private
export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      mockDiscussions = mockDiscussions.filter(t => t._id !== id);
      return res.json({ success: true, message: 'Discussion successfully deleted from memory cache' });
    }

    // --- PRODUCTION DB MODE ---
    const discussion = await Discussion.findById(id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    if (
      discussion.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'moderator'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this discussion' });
    }

    await Comment.deleteMany({ discussion: id });
    await discussion.deleteOne();

    res.json({ success: true, message: 'Discussion and all comments successfully deleted' });
  } catch (error) {
    console.error('Delete Discussion Error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting discussion' });
  }
};
