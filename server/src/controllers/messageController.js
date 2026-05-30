import Message from '../models/Message.js';

// @desc    Get messages history for a channel
// @route   GET /api/messages/:channel
// @access  Private
export const getMessagesByChannel = async (req, res) => {
  try {
    const { channel } = req.params;

    // Fetch the 50 most recent messages, populate sender, and sort chronologically
    const messages = await Message.find({ channel })
      .populate('sender', 'username avatar role')
      .sort({ createdAt: -1 })
      .limit(50);

    // Return in ascending chronological order for the client UI
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving message history' });
  }
};

// @desc    Store a message (usually called via API fallback or test script)
// @route   POST /api/messages
// @access  Private
export const createMessage = async (req, res) => {
  try {
    const { channel, text } = req.body;

    if (!channel || !text) {
      return res.status(400).json({ success: false, message: 'Channel and text are required' });
    }

    const message = await Message.create({
      channel,
      sender: req.user._id,
      text,
    });

    const populated = await Message.findById(message._id).populate('sender', 'username avatar role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error saving message' });
  }
};
