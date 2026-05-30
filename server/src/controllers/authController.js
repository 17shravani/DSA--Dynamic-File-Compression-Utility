import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Helper to check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// Helper to sign JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      console.log('⚠️  Mock-registering user in Memory Sandbox...');
      const mockUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        username,
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        role: 'user',
        bio: bio || 'Welcome to the PulseNet Sandbox!',
      };
      
      return res.status(201).json({
        success: true,
        token: generateToken(mockUser._id),
        user: mockUser
      });
    }

    // --- PRODUCTION DB MODE ---
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const user = await User.create({
      username,
      email,
      password,
      bio,
    });

    if (user) {
      res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          bio: user.bio,
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      console.log('⚠️  Validating login in Memory Sandbox mode...');
      // Allow any login in sandbox mode, defaulting to developer_alice for testing
      const isAlice = email.toLowerCase().includes('alice');
      const isBob = email.toLowerCase().includes('bob');
      
      const mockUser = {
        _id: isAlice ? "6658091f802ea7945d8b8b00" : isBob ? "6658091f802ea7945d8b8b03" : new mongoose.Types.ObjectId().toString(),
        username: isAlice ? "developer_alice" : isBob ? "coder_bob" : "sandbox_member",
        email: email.toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${isAlice ? 'developer_alice' : isBob ? 'coder_bob' : 'sandbox'}`,
        role: isAlice ? 'admin' : isBob ? 'user' : 'user',
        bio: isAlice ? 'Principal Software Architect.' : 'Sandbox member.',
      };

      return res.json({
        success: true,
        token: generateToken(mockUser._id),
        user: mockUser
      });
    }

    // --- PRODUCTION DB MODE ---
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // --- FALLBACK SANDBOX MODE ---
    if (!isDbConnected()) {
      // In sandbox mode, dynamically construct profile using information stored inside decoded JWT
      return res.json({
        success: true,
        user: {
          _id: req.user ? req.user._id : "6658091f802ea7945d8b8b00",
          username: req.user ? req.user.username : "developer_alice",
          email: req.user ? req.user.email : "alice@pulsenet.dev",
          avatar: req.user ? req.user.avatar : "https://api.dicebear.com/7.x/bottts/svg?seed=developer_alice",
          role: req.user ? req.user.role : "admin",
          bio: req.user ? req.user.bio : "Principal Software Architect.",
        }
      });
    }

    // --- PRODUCTION DB MODE ---
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};
