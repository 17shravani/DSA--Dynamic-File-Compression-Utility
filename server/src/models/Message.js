import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true,
      index: true, // Speeds up channel lookup queries
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Message', MessageSchema);
