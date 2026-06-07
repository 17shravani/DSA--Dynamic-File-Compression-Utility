import mongoose from 'mongoose';

const CompressionRecordSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  compressedPath: {
    type: String,
    required: true,
  },
  codec: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    required: true,
  },
  mode: {
    type: String,
    required: true,
  },
  origBytes: {
    type: Number,
    required: true,
  },
  outBytes: {
    type: Number,
    required: true,
  },
  ratio: {
    type: Number,
    required: true,
  },
  timeSeconds: {
    type: Number,
    required: true,
  },
  speedMbs: {
    type: Number,
    required: true,
  },
  sha256: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('CompressionRecord', CompressionRecordSchema);
