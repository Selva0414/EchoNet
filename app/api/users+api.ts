import connectToDatabase from '../../lib/db';
import User from '../../models/User';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // In a real app, we might want to exclude the current user
    // For now, just return all users
    const users = await User.find({}, 'email _id name profileImage');
    
    return Response.json(users);
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
