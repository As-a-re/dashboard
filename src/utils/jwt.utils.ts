import jwt from 'jsonwebtoken';
import { IUser } from '../types';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (user: IUser): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Convert JWT_EXPIRES_IN to number of seconds if it's a string with time unit
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  
  // Convert string time to seconds for type safety
  const expiresInSeconds = (): number => {
    if (typeof expiresIn === 'number') return expiresIn;
    
    const match = expiresIn.match(/^(\d+)([smhdwmy])/);
    if (!match) return 30 * 24 * 60 * 60; // Default 30 days in seconds
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value; // seconds
      case 'm': return value * 60; // minutes
      case 'h': return value * 60 * 60; // hours
      case 'd': return value * 60 * 60 * 24; // days
      case 'w': return value * 60 * 60 * 24 * 7; // weeks
      case 'y': return value * 60 * 60 * 24 * 365; // years
      default: return 30 * 24 * 60 * 60; // Default 30 days in seconds
    }
  };

  const options: jwt.SignOptions = {
    expiresIn: expiresInSeconds(),
    algorithm: 'HS256',
  };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as JwtPayload;
};
