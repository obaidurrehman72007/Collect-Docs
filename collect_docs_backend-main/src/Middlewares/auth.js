
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return res.status(401).json({ message: 'Authentication required - Bearer token expected' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      console.log('Token is empty after Bearer');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set in environment');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const payload = jwt.verify(token, secret);
    console.log('JWT payload decoded:', payload); 

    
    const userId = payload.userId || payload.id || payload.sub || payload.user_id;
    if (!userId) {
      console.log('JWT missing user identifier (userId/id/sub)');
      return res.status(401).json({ message: 'Invalid token - missing user ID' });
    }

    req.user = {
      userId,                         
      id: userId,
      email: payload.email,
      role: payload.role,
      workspaceId: payload.workspaceId || payload.workspace_id,
      userType: payload.userType || payload.user_type,
    };

    req.workspaceId = req.user.workspaceId;

  

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message, err.stack);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export default authMiddleware;