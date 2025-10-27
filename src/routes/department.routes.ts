import { Router, Request, Response } from 'express';
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

// Middleware to protect routes
router.use(authenticateJWT);

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 * @access  Private
 */
router.get('/', (req: Request, res: Response) => {
  // In a real app, you would fetch departments from the database
  // with pagination, filtering, and sorting
  res.json({ 
    message: 'Get all departments',
    departments: []
  });
});

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 * @access  Private
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // In a real app, you would fetch the department by ID from the database
  res.json({ 
    message: `Get department with ID: ${id}`,
    department: { id }
  });
});

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Private (Admin)
 */
router.post('/', checkRole(['admin']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // In a real app, you would validate the request body and create the department
  res.status(201).json({ 
    message: 'Department created',
    department: req.body
  });
});

/**
 * @route   PUT /api/departments/:id
 * @desc    Update a department
 * @access  Private (Admin, Department Head)
 */
router.put('/:id', checkRole(['admin', 'department_head']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id } = req.params;
  // In a real app, you would update the department in the database
  res.json({ 
    message: `Updated department with ID: ${id}`,
    department: { id, ...req.body }
  });
});

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete a department
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id } = req.params;
  // In a real app, you would delete the department from the database
  res.json({ 
    message: `Deleted department with ID: ${id}`,
    id
  });
});

export default router;
