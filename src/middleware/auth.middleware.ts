import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'default-secret';

    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      // Standardize the user object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Log the user object for debugging
    console.log('User in checkRole:', req.user);
    
    // Check if user role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      console.log(`Access denied. Required roles: ${roles.join(', ')}, User role: ${req.user.role}`);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
