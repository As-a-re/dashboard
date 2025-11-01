import { Request, Response } from 'express';
import Notification from '../models/notification.model';
import { IUser } from '../types';

// Extend the Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * @desc    Get user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = { user: req.user?.id };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user?.id,
      isRead: false
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Mark notifications as read
 * @route   PATCH /api/notifications/mark-read
 * @access  Private
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'notificationIds must be an array' 
      });
    }

    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        user: req.user?.id
      },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    await Notification.updateMany(
      { user: req.user?.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user?.id
    });

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found or access denied' 
      });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
export const clearAllNotifications = async (req: Request, res: Response) => {
  try {
    await Notification.deleteMany({ user: req.user?.id });
    
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
