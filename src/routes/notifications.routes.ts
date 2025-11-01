import { Router, Request, Response } from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import { IUser } from '../types';
import Notification from '../models/notification.model';

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
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/notifications/unread
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get('/unread', async (req: Request, res: Response) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user?.id,
      isRead: false
    });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/notifications/mark-read
 * @desc    Mark notifications as read
 * @access  Private
 */
router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const { notificationIds } = req.body;
    
    await Notification.updateMany(
      { _id: { $in: notificationIds }, user: req.user?.id },
      { $set: { isRead: true } }
    );
    
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user?.id
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/notifications
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    await Notification.deleteMany({ user: req.user?.id });
    
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
