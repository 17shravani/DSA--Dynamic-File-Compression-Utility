import mongoose from 'mongoose';

const CommentVoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    voteType: {
      type: String,
      enum: ['up', 'down'],
      required: true,
    },
  },
  { _id: false }
);

const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [2, 'Comment must be at least 2 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    discussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    votes: [CommentVoteSchema],
    voteScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate voteScore
CommentSchema.pre('save', function (next) {
  if (this.isModified('votes')) {
    this.voteScore = this.votes.reduce((acc, vote) => {
      return acc + (vote.voteType === 'up' ? 1 : -1);
    }, 0);
  }
  next();
});

export default mongoose.model('Comment', CommentSchema);
