const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Auth Routes for Global Access
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ 
      user: { id: user._id, email: user.email, name: user.name, profileImage: user.profileImage } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const newUser = await User.create({ email, password });
    res.json({ 
      user: { id: newUser._id, email: newUser.email, name: newUser.name, profileImage: newUser.profileImage } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check route
app.get('/', (req, res) => {
  res.send('EchoNet Server is Running Successfully! 🚀');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected for Socket Server'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
  mediaUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// User Schema (simplified for socket server)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  profileImage: { type: String },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, content, type, mediaUrl } = data;
    
    try {
      const newMessage = await Message.create({ 
        senderId, 
        receiverId, 
        content, 
        type: type || 'text', 
        mediaUrl 
      });
      
      // Fetch sender name for notification
      const User = mongoose.model('User');
      const sender = await User.findById(senderId).select('name email');
      const senderName = sender?.name || sender?.email?.split('@')[0] || 'Someone';

      const messageObj = {
        _id: newMessage._id.toString(),
        senderId: senderId.toString(),
        receiverId: receiverId.toString(),
        content: newMessage.content,
        type: newMessage.type,
        mediaUrl: newMessage.mediaUrl,
        timestamp: newMessage.timestamp,
        senderName: senderName,
      };
      
      console.log(`Sending ${newMessage.type} message from ${senderName} to ${receiverId}`);
      
      // Emit to both sender and receiver rooms
      io.to(senderId.toString()).emit('receive_message', messageObj);
      io.to(receiverId.toString()).emit('receive_message', messageObj);
      
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
