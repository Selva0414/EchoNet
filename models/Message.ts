import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'audio'],
    default: 'text',
  },
  mediaUrl: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
