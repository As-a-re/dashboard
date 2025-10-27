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
 * @route   GET /api/attendance
 * @desc    Get all attendance records
 * @access  Private (Admin, Attendance Manager)
 */
router.get('/', checkRole(['admin', 'attendance_manager']), (req: Request, res: Response) => {
  // In a real app, you would fetch attendance records from the database
  // with pagination, filtering, and sorting
  res.json({ 
    message: 'Get all attendance records',
    attendance: []
  });
});

/**
 * @route   GET /api/attendance/:id
 * @desc    Get attendance record by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In a real app, you would fetch the attendance record by ID from the database
    res.json({ 
      message: `Get attendance record with ID: ${id}`,
      attendance: { id }
    });
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/attendance
 * @desc    Mark attendance
 * @access  Private (Admin, Attendance Manager)
 */
router.post('/', checkRole(['admin', 'attendance_manager']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // In a real app, you would validate the request body and mark attendance
    res.status(201).json({ 
      message: 'Attendance marked successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Error marking attendance' });
  }
});

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record
 * @access  Private (Admin, Attendance Manager)
 */
router.put('/:id', checkRole(['admin', 'attendance_manager']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would update the attendance record in the database
    res.json({ 
      message: `Updated attendance record with ID: ${id}`,
      data: { id, ...req.body }
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ message: 'Error updating attendance' });
  }
});

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would delete the attendance record from the database
    res.json({ 
      message: `Deleted attendance record with ID: ${id}`,
      id
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ message: 'Error deleting attendance' });
  }
});

/**
 * @route   GET /api/attendance/user/:userId
 * @desc    Get user's attendance records
 * @access  Private
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { userId } = req.params;
    
    // Check if user is requesting their own attendance or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view this attendance' 
      });
    }
    
    // In a real app, you would fetch the user's attendance records from the database
    res.json({ 
      message: `Get attendance for user with ID: ${userId}`,
      userId,
      attendance: []
    });
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ message: 'Error fetching user attendance' });
  }
});

/**
 * @route   GET /api/attendance/event/:eventId
 * @desc    Get attendance for an event
 * @access  Private
 */
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { eventId } = req.params;
    
    // In a real app, you would fetch attendance records for the event from the database
    res.json({ 
      message: `Get attendance for event with ID: ${eventId}`,
      eventId,
      attendance: []
    });
  } catch (error) {
    console.error('Error fetching event attendance:', error);
    res.status(500).json({ message: 'Error fetching event attendance' });
  }
});

export default router;
