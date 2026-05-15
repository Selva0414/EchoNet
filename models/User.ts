import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  name: {
    type: String,
    default: '',
  },
  profileImage: {
    type: String,
    default: '',
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
