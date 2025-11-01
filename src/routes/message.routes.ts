import { Router, Request, Response } from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import { IUser } from '../types';
import Message from '../models/message.model';

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
 * @route   GET /api/messages
 * @desc    Get user's messages
 * @access  Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { folder = 'inbox', search = '', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let query: any = {
      'recipients.user': req.user?.id,
      'recipients.deleted': false
    };

    // Filter by folder
    if (folder === 'inbox') {
      query.sender = { $ne: req.user?.id }; // Not sent by the user
    } else if (folder === 'sent') {
      query.sender = req.user?.id;
    } else if (folder === 'starred') {
      query.isStarred = true;
    } else if (folder === 'draft') {
      query.isDraft = true;
      query.sender = req.user?.id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('recipients.user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Message.countDocuments(query);
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/messages/thread/:threadId
 * @desc    Get message thread
 * @access  Private
 */
router.get('/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const thread = await Message.find({
      $or: [
        { threadId: req.params.threadId },
        { _id: req.params.threadId }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email')
    .sort({ createdAt: 1 });

    if (!thread || thread.length === 0) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    // Mark as read
    await Message.updateMany(
      {
        _id: { $in: thread.map(m => m._id) },
        'recipients.user': req.user?.id,
        'recipients.read': false
      },
      { $set: { 'recipients.$.read': true, 'recipients.$.readAt': new Date() } }
    );

    res.json({ success: true, data: thread });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [
        { sender: req.user?.id },
        { 'recipients.user': req.user?.id, 'recipients.deleted': false }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email');

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Mark as read if recipient
    if (message.sender._id.toString() !== req.user?.id) {
      await Message.updateOne(
        { _id: message._id, 'recipients.user': req.user?.id },
        { $set: { 'recipients.$.read': true, 'recipients.$.readAt': new Date() } }
      );
    }

    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { recipients, subject, body, parentMessageId, isDraft = false } = req.body;
    
    // Basic validation
    if (!isDraft && (!recipients || !Array.isArray(recipients) || recipients.length === 0)) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    const messageData: any = {
      sender: req.user?.id,
      recipients: recipients.map((recipient: any) => ({
        user: recipient,
        read: false,
        deleted: false
      })),
      subject,
      body,
      isThread: !!parentMessageId,
      threadId: parentMessageId,
      isDraft,
      isPinned: false,
      isStarred: false,
      labels: [],
      attachments: req.body.attachments || [],
      isReadByRecipient: false
    };

    const message = new Message(messageData);
    await message.save();

    // Populate sender for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipients.user', 'name email');

    res.status(201).json({ 
      success: true, 
      message: isDraft ? 'Draft saved successfully' : 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/messages/:id
 * @desc    Update message (mark as read, star, etc.)
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { isStarred, isPinned, labels, isDraft, recipients } = req.body;
    const update: any = {};

    if (typeof isStarred !== 'undefined') update.isStarred = isStarred;
    if (typeof isPinned !== 'undefined') update.isPinned = isPinned;
    if (labels) update.labels = labels;
    
    // For drafts, allow updating recipients and other fields
    if (isDraft && recipients) {
      update.recipients = recipients.map((recipient: any) => ({
        user: recipient,
        read: false,
        deleted: false
      }));
      update.updatedAt = new Date();
    }

    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { sender: req.user?.id },
          { 'recipients.user': req.user?.id, 'recipients.deleted': false }
        ]
      },
      { $set: update },
      { new: true }
    )
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email');

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ 
      success: true, 
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message (soft delete for recipients, hard delete for sender)
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // If user is the sender, delete the message entirely
    if (message.sender.toString() === req.user?.id) {
      await Message.deleteOne({ _id: message._id });
    } 
    // If user is a recipient, mark as deleted
    else {
      await Message.updateOne(
        { _id: message._id, 'recipients.user': req.user?.id },
        { $set: { 'recipients.$.deleted': true } }
      );
    }

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
