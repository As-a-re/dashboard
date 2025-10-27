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

// Protect all routes with JWT authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/finance
 * @desc    Get all financial records
 * @access  Private (Admin, Finance Manager)
 */
router.get('/', checkRole(['admin', 'finance_manager']), (req: Request, res: Response) => {
  try {
    // In a real app, you would fetch financial records from the database
    // with pagination, filtering, and sorting
    res.json({ 
      message: 'Get all financial records',
      records: []
    });
  } catch (error) {
    console.error('Error fetching financial records:', error);
    res.status(500).json({ message: 'Error fetching financial records' });
  }
});

/**
 * @route   GET /api/finance/:id
 * @desc    Get financial record by ID
 * @access  Private (Admin, Finance Manager)
 */
router.get('/:id', checkRole(['admin', 'finance_manager']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In a real app, you would fetch the financial record by ID from the database
    res.json({ 
      message: `Get financial record with ID: ${id}`,
      record: { id }
    });
  } catch (error) {
    console.error('Error fetching financial record:', error);
    res.status(500).json({ message: 'Error fetching financial record' });
  }
});

/**
 * @route   POST /api/finance
 * @desc    Create a new financial record
 * @access  Private (Admin, Finance Manager)
 */
router.post('/', checkRole(['admin', 'finance_manager']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // In a real app, you would validate the request body and create the record
    res.status(201).json({ 
      message: 'Financial record created successfully',
      record: req.body
    });
  } catch (error) {
    console.error('Error creating financial record:', error);
    res.status(500).json({ message: 'Error creating financial record' });
  }
});

/**
 * @route   PUT /api/finance/:id
 * @desc    Update a financial record
 * @access  Private (Admin, Finance Manager)
 */
router.put('/:id', checkRole(['admin', 'finance_manager']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would update the financial record in the database
    res.json({ 
      message: `Updated financial record with ID: ${id}`,
      record: { id, ...req.body }
    });
  } catch (error) {
    console.error('Error updating financial record:', error);
    res.status(500).json({ message: 'Error updating financial record' });
  }
});

/**
 * @route   DELETE /api/finance/:id
 * @desc    Delete a financial record
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would delete the financial record from the database
    res.json({ 
      message: `Deleted financial record with ID: ${id}`,
      id
    });
  } catch (error) {
    console.error('Error deleting financial record:', error);
    res.status(500).json({ message: 'Error deleting financial record' });
  }
});

/**
 * @route   GET /api/finance/user/:userId
 * @desc    Get user's financial records
 * @access  Private
 */
router.get('/user/:userId', (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { userId } = req.params;
    
    // Check if user is requesting their own records or is admin/finance manager
    if (req.user.id !== userId && !['admin', 'finance_manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized to view these records' 
      });
    }
    
    // In a real app, you would fetch the user's financial records from the database
    res.json({ 
      message: `Get financial records for user with ID: ${userId}`,
      userId,
      records: []
    });
  } catch (error) {
    console.error('Error fetching user financial records:', error);
    res.status(500).json({ message: 'Error fetching user financial records' });
  }
});

/**
 * @route   GET /api/finance/summary
 * @desc    Get financial summary
 * @access  Private (Admin, Finance Manager)
 */
router.get('/summary', checkRole(['admin', 'finance_manager']), (req: Request, res: Response) => {
  try {
    // In a real app, you would calculate the financial summary from the database
    res.json({ 
      message: 'Financial summary',
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        byCategory: {},
        recentTransactions: []
      }
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ message: 'Error fetching financial summary' });
  }
});

export default router;
