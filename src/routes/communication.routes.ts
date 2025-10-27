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
 * @route   GET /api/communications
 * @desc    Get all communications
 * @access  Private (Admin, Communication Manager)
 */
router.get('/', checkRole(['admin', 'communication_manager']), (req: Request, res: Response) => {
  try {
    // In a real app, you would fetch communications from the database
    // with pagination, filtering, and sorting
    res.json({ 
      message: 'Get all communications',
      communications: []
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ message: 'Error fetching communications' });
  }
});

/**
 * @route   GET /api/communications/:id
 * @desc    Get communication by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In a real app, you would fetch the communication by ID from the database
    res.json({ 
      message: `Get communication with ID: ${id}`,
      communication: { 
        id,
        title: 'Sample Communication',
        content: 'This is a sample communication',
        type: 'announcement',
        createdAt: new Date(),
        createdBy: 'system'
      }
    });
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ message: 'Error fetching communication' });
  }
});

/**
 * @route   POST /api/communications
 * @desc    Create a new communication
 * @access  Private (Admin, Communication Manager)
 */
router.post('/', checkRole(['admin', 'communication_manager']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { title, content, type, recipients } = req.body;
    
    // In a real app, you would validate the request body and create the communication
    res.status(201).json({ 
      message: 'Communication created successfully',
      communication: {
        id: 'new-communication-id',
        title,
        content,
        type,
        recipients,
        createdAt: new Date(),
        createdBy: req.user.id
      }
    });
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({ message: 'Error creating communication' });
  }
});

/**
 * @route   PUT /api/communications/:id
 * @desc    Update a communication
 * @access  Private (Admin, Communication Manager)
 */
router.put('/:id', checkRole(['admin', 'communication_manager']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would update the communication in the database
    res.json({ 
      message: `Updated communication with ID: ${id}`,
      communication: { id, ...req.body, updatedAt: new Date(), updatedBy: req.user.id }
    });
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({ message: 'Error updating communication' });
  }
});

/**
 * @route   DELETE /api/communications/:id
 * @desc    Delete a communication
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.params;
    // In a real app, you would delete the communication from the database
    res.json({ 
      message: `Deleted communication with ID: ${id}`,
      id
    });
  } catch (error) {
    console.error('Error deleting communication:', error);
    res.status(500).json({ message: 'Error deleting communication' });
  }
});

/**
 * @route   GET /api/communications/user/:userId
 * @desc    Get communications for a specific user
 * @access  Private
 */
router.get('/user/:userId', (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { userId } = req.params;
    
    // Check if user is requesting their own communications or is admin/communication manager
    if (req.user.id !== userId && !['admin', 'communication_manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized to view these communications' 
      });
    }
    
    // In a real app, you would fetch the user's communications from the database
    res.json({ 
      message: `Get communications for user with ID: ${userId}`,
      userId,
      communications: []
    });
  } catch (error) {
    console.error('Error fetching user communications:', error);
    res.status(500).json({ message: 'Error fetching user communications' });
  }
});

/**
 * @route   POST /api/communications/notify
 * @desc    Send a notification
 * @access  Private (Admin, Communication Manager)
 */
router.post('/notify', checkRole(['admin', 'communication_manager']), (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { title, message, recipients, type = 'info' } = req.body;
    
    if (!title || !message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        message: 'Title, message, and at least one recipient are required' 
      });
    }
    
    // In a real app, you would send the notification to the recipients
    res.json({ 
      message: 'Notification sent successfully',
      notification: {
        id: 'notification-id',
        title,
        message,
        type,
        recipients,
        sentAt: new Date(),
        sentBy: req.user.id
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Error sending notification' });
  }
});

export default router;
