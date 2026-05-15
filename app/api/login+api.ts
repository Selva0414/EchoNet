import connectToDatabase from '../../lib/db';
import User from '../../models/User';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, action } = body; // action can be 'login' or 'signup'

    if (!email || !password) {
      return Response.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Attempt DB connection
    try {
      await connectToDatabase();
    } catch (dbError: any) {
      console.error('Database connection failed:', dbError);
      return Response.json({ error: 'Database connection failed. Is your IP whitelisted in MongoDB Atlas?', details: dbError.message }, { status: 500 });
    }

    if (action === 'signup') {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return Response.json({ error: 'User already exists' }, { status: 400 });
      }
      const newUser = await User.create({ email, password });
      return Response.json({ 
        message: 'User created successfully', 
        user: { id: newUser._id, email: newUser.email, name: newUser.name, profileImage: newUser.profileImage } 
      });
    } 
    
    // Default to login
    const user = await User.findOne({ email });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.password !== password) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    return Response.json({ 
      message: 'Login successful', 
      user: { id: user._id, email: user.email, name: user.name, profileImage: user.profileImage } 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return Response.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
