import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import { IUser } from '../types';

const router = Router();

// Extend the Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Protect all routes with JWT authentication
router.use(authenticateJWT);

// Get all users (admin only)
router.get('/', checkRole(['admin']), (req: Request, res: Response) => {
  res.json({ message: 'Get all users' });
});

// Get current user profile
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json({ message: 'Get current user profile', user: req.user });
});

// Get user by ID
router.get('/:id', (req: Request, res: Response) => {
  res.json({ message: `Get user with ID: ${req.params.id}` });
});

// Create a new user (admin only)
router.post('/', checkRole(['admin']), (req: Request, res: Response) => {
  res.status(201).json({ message: 'User created' });
});

// Update a user
router.put('/:id', (req: Request, res: Response) => {
  // Check if user is updating their own profile or is admin
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to update this user' });
  }
  
  res.json({ message: `Updated user with ID: ${req.params.id}` });
});

// Delete a user (admin only)
router.delete('/:id', checkRole(['admin']), (req: Request, res: Response) => {
  res.json({ message: `Deleted user with ID: ${req.params.id}` });
});

export default router;
