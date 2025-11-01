import { Request, Response } from 'express';
import Announcement from '../models/announcement.model';
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
 * @desc    Get all announcements
 * @route   GET /api/announcements
 * @access  Private
 */
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, isPinned } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const query: any = {};
    if (isPinned !== undefined) {
      query.isPinned = isPinned === 'true';
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Announcement.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: announcements,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get announcement by ID
 * @route   GET /api/announcements/:id
 * @access  Private
 */
export const getAnnouncementById = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'name email');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Create new announcement
 * @route   POST /api/announcements
 * @access  Private (Admin)
 */
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, isPinned } = req.body;

    const announcement = new Announcement({
      title,
      content,
      isPinned: isPinned || false,
      author: req.user?.id
    });

    const savedAnnouncement = await announcement.save();
    await savedAnnouncement.populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: savedAnnouncement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update announcement
 * @route   PUT /api/announcements/:id
 * @access  Private (Admin)
 */
export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, isPinned } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content, isPinned, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/announcements/:id
 * @access  Private (Admin)
 */
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
