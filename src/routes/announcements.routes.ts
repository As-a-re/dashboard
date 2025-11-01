import { Router, Request, Response } from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import { IUser } from '../types';
import Announcement from '../models/announcement.model';

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
 * @route   GET /api/announcements
 * @desc    Get all announcements
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('author', 'name email');
    
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/announcements/:id
 * @desc    Get announcement by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
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
});

/**
 * @route   POST /api/announcements
 * @desc    Create new announcement
 * @access  Private (Admin)
 */
router.post('/', checkRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { title, content, isPinned } = req.body;
    
    const newAnnouncement = new Announcement({
      title,
      content,
      isPinned: isPinned || false,
      author: req.user?.id
    });

    const savedAnnouncement = await newAnnouncement.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Announcement created successfully',
      data: savedAnnouncement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update announcement
 * @access  Private (Admin)
 */
router.put('/:id', checkRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { title, content, isPinned } = req.body;
    
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content, isPinned, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedAnnouncement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete announcement
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Announcement deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
