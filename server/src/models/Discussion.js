import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema(
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

const DiscussionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Discussion title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Discussion content is required'],
      minlength: [10, 'Content must be at least 10 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    votes: [VoteSchema],
    voteScore: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate voteScore
DiscussionSchema.pre('save', function (next) {
  if (this.isModified('votes')) {
    this.voteScore = this.votes.reduce((acc, vote) => {
      return acc + (vote.voteType === 'up' ? 1 : -1);
    }, 0);
  }
  next();
});

export default mongoose.model('Discussion', DiscussionSchema);
