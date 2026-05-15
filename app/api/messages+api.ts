import connectToDatabase from '../../lib/db';
import Message from '../../models/Message';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return Response.json({ error: 'Missing users' }, { status: 400 });
    }

    await connectToDatabase();
    
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ timestamp: 1 });
    
    return Response.json(messages);
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
