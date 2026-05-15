import connectToDatabase from '../../lib/db';
import Message from '../../models/Message';
import User from '../../models/User';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find all unique users the current user has messaged
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).select('senderId receiverId');

    const partnerIds = new Set();
    messages.forEach(msg => {
      const sId = msg.senderId.toString();
      const rId = msg.receiverId.toString();
      if (sId !== userId) partnerIds.add(sId);
      if (rId !== userId) partnerIds.add(rId);
    });

    const chats = await User.find({ _id: { $in: Array.from(partnerIds) } }).select('name email profileImage');
    
    return Response.json(chats);
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
