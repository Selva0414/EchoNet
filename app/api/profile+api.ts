import connectToDatabase from '../../lib/db';
import User from '../../models/User';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, profileImage } = body;

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Attempt DB connection
    try {
      await connectToDatabase();
    } catch (dbError: any) {
      console.error('Database connection failed:', dbError);
      return Response.json({ 
        error: 'Database connection failed. Is your IP whitelisted in MongoDB Atlas?', 
        details: dbError.message 
      }, { status: 500 });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, profileImage } },
      { new: true }
    );

    if (!updatedUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ 
      message: 'Profile updated successfully', 
      user: { 
        id: updatedUser._id, 
        email: updatedUser.email,
        name: updatedUser.name,
        profileImage: updatedUser.profileImage
      } 
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
