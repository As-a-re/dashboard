import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Message, { IMessage } from '../models/message.model';
import { IUser } from '../types';

// Extend the Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Helper function to get messages with common query logic
const getMessagesQuery = async (query: any, userId: string, page: number = 1, limit: number = 20) => {
  const skip = (page - 1) * limit;
  
  const [messages, total] = await Promise.all([
    Message.find(query)
      .populate('sender', 'name email')
      .populate('recipients.user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments(query)
  ]);

  // Filter out deleted messages for the current user
  const filteredMessages = messages.filter(message => {
    if (message.sender._id.toString() === userId) return true;
    
    const recipient = message.recipients.find(r => 
      r.user._id.toString() === userId && !r.deleted
    );
    
    return !!recipient;
  });

  return {
    messages: filteredMessages,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit
  };
};

/**
 * @desc    Get user's messages
 * @route   GET /api/messages
 * @access  Private
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { 
      folder = 'inbox', 
      search = '', 
      page = 1, 
      limit = 20,
      isStarred,
      isPinned
    } = req.query as any;
    
    const userId = req.user?.id as string;
    let query: any = { 
      $or: [
        { 'sender': userId },
        { 'recipients.user': userId }
      ]
    };

    // Filter by folder
    if (folder === 'inbox') {
      query = {
        ...query,
        'recipients.user': userId,
        'recipients.deleted': false,
        'isDraft': false
      };
    } else if (folder === 'sent') {
      query = {
        ...query,
        'sender': userId,
        'isDraft': false
      };
    } else if (folder === 'draft') {
      query = {
        ...query,
        'sender': userId,
        'isDraft': true
      };
    } else if (folder === 'starred') {
      query = {
        ...query,
        'recipients': {
          $elemMatch: { 
            user: userId,
            isStarred: true,
            deleted: false
          }
        }
      };
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { subject: { $regex: searchRegex } },
        { body: { $regex: searchRegex } },
        { 'sender.name': { $regex: searchRegex } },
        { 'sender.email': { $regex: searchRegex } }
      ];
    }

    // Additional filters
    if (isStarred) {
      query['recipients.$.isStarred'] = isStarred === 'true';
    }
    if (isPinned) {
      query['recipients.$.isPinned'] = isPinned === 'true';
    }

    const result = await getMessagesQuery(
      query, 
      userId, 
      parseInt(page as string), 
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        limit: result.limit
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get message thread
 * @route   GET /api/messages/thread/:threadId
 * @access  Private
 */
export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id as string;

    // Find the original message
    const originalMessage = await Message.findOne({
      _id: threadId,
      $or: [
        { sender: userId },
        { 'recipients.user': userId, 'recipients.deleted': false }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email');

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Find all messages in the thread
    const threadMessages = await Message.find({
      $and: [
        {
          $or: [
            { threadId: threadId },
            { _id: threadId }
          ]
        },
        {
          $or: [
            { sender: userId },
            { 'recipients.user': userId, 'recipients.deleted': false }
          ]
        }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email')
    .sort({ createdAt: 1 }); // Sort by oldest first for thread view

    // Mark messages as read for the current user
    const messageIds = threadMessages
      .filter(msg => 
        msg.sender._id.toString() !== userId && 
        msg.recipients.some(r => 
          r.user._id.toString() === userId && 
          !r.read
        )
      )
      .map(msg => msg._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { 
          $set: { 
            'recipients.$[elem].read': true,
            'recipients.$[elem].readAt': new Date()
          } 
        },
        { 
          arrayFilters: [{ 'elem.user': userId }],
          multi: true 
        }
      );
    }

    res.json({
      success: true,
      data: threadMessages
    });
  } catch (error) {
    console.error('Error fetching message thread:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get message by ID
 * @route   GET /api/messages/:id
 * @access  Private
 */
export const getMessageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id as string;

    const message = await Message.findOne({
      _id: id,
      $or: [
        { sender: userId },
        { 'recipients.user': userId, 'recipients.deleted': false }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipients.user', 'name email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Mark as read if recipient
    if (message.sender._id.toString() !== userId) {
      const recipientIndex = message.recipients.findIndex(
        r => r.user._id.toString() === userId && !r.read
      );
      
      if (recipientIndex !== -1) {
        message.recipients[recipientIndex].read = true;
        message.recipients[recipientIndex].readAt = new Date();
        await message.save();
      }
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Send a new message
 * @route   POST /api/messages
 * @access  Private
 */
export const sendMessage = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      recipients, 
      subject, 
      body, 
      isDraft = false, 
      parentMessageId,
      attachments = [] 
    } = req.body;
    
    const senderId = req.user?.id as string;

    // Validate required fields for non-draft messages
    if (!isDraft) {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one recipient is required'
        });
      }
      
      if (!subject || !subject.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Subject is required'
        });
      }
      
      if (!body || !body.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message body is required'
        });
      }
    }

    // Create a thread ID if this is a new conversation
    let threadId = parentMessageId || new mongoose.Types.ObjectId().toString();
    
    // If this is a reply, verify the parent message exists and user has access
    if (parentMessageId) {
      const parentMessage = await Message.findOne({
        _id: parentMessageId,
        $or: [
          { sender: senderId },
          { 'recipients.user': senderId, 'recipients.deleted': false }
        ]
      }).session(session);

      if (!parentMessage) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Parent message not found or access denied'
        });
      }
      
      // Use the parent's thread ID
      threadId = parentMessage.threadId || parentMessage._id;
    }

    // Prepare recipients array
    const recipientsList = isDraft 
      ? [] 
      : (recipients as string[]).map(recipientId => ({
          user: recipientId,
          isRead: false,
          isStarred: false,
          isPinned: false,
          deleted: false
        }));

    // Create the message
    const message = new Message({
      sender: senderId,
      recipients: recipientsList,
      subject,
      body,
      isDraft,
      threadId,
      attachments,
      isRead: isDraft // Drafts are marked as read by default for the sender
    });

    await message.save({ session });
    
    // Populate sender and recipients for the response
    await message.populate('sender', 'name email');
    await message.populate('recipients.user', 'name email');

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: isDraft ? 'Draft saved successfully' : 'Message sent successfully',
      data: message
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message',
      error: errorMessage
    });
  }
};

/**
 * @desc    Update message (star, pin, read status, etc.)
 * @route   PUT /api/messages/:id
 * @access  Private
 */
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id as string;
    const updates = req.body;
    
    // Allowed fields that can be updated
    const allowedUpdates = [
      'isStarred', 
      'isPinned', 
      'isRead', 
      'deleted',
      'subject',
      'body',
      'recipients',
      'isDraft'
    ];
    
    // Filter updates to only include allowed fields
    const updatesToApply: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updatesToApply[key] = updates[key];
      }
    });
    
    // If no valid updates provided
    if (Object.keys(updatesToApply).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }
    
    // Find the message and update
    const message = await Message.findOne({
      _id: id,
      $or: [
        { sender: userId },
        { 'recipients.user': userId }
      ]
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }
    
    // If user is the sender, update the message directly
    if (message.sender.toString() === userId) {
      Object.assign(message, updatesToApply);
      await message.save();
      
      return res.json({
        success: true,
        message: 'Message updated successfully',
        data: message
      });
    }
    
    // If user is a recipient, update their recipient info
    const recipientIndex = message.recipients.findIndex(
      r => r.user.toString() === userId
    );
    
    if (recipientIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Update recipient-specific fields
    const recipient = message.recipients[recipientIndex];
    
    // Handle read status update
    if ('read' in updatesToApply) {
      recipient.read = updatesToApply.read as boolean;
      recipient.readAt = updatesToApply.read ? new Date() : undefined;
    }
    
    // Handle deleted status
    if ('deleted' in updatesToApply) {
      recipient.deleted = updatesToApply.deleted as boolean;
    }
    
    message.recipients[recipientIndex] = recipient;
    await message.save();
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update message',
      error: errorMessage
    });
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
export const deleteMessage = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const userId = req.user?.id as string;
    const { hardDelete = 'false' } = req.query;
    
    const shouldHardDelete = hardDelete === 'true';
    
    // Find the message
    const message = await Message.findById(id).session(session);
    
    if (!message) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Check if user is the sender
    const isSender = message.sender.toString() === userId;
    
    // Check if user is a recipient
    const recipientIndex = message.recipients.findIndex(
      r => r.user.toString() === userId
    );
    
    if (!isSender && recipientIndex === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (shouldHardDelete && isSender) {
      // Hard delete if user is sender and hardDelete=true
      await Message.findByIdAndDelete(id).session(session);
    } else if (isSender) {
      // For sender, mark all recipients as deleted
      message.recipients = message.recipients.map(r => ({
        ...r,
        deleted: true
      }));
      await message.save({ session });
    } else {
      // For recipients, mark as deleted in their recipient entry
      if (recipientIndex !== -1) {
        message.recipients[recipientIndex].deleted = true;
        await message.save({ session });
      }
    }
    
    // Check if all recipients and sender have deleted the message
    if (!shouldHardDelete && isSender) {
      const allRecipientsDeleted = message.recipients.every(r => r.deleted);
      
      // Check if sender has already marked as deleted (using a different approach)
      // Since deletedBySender is not in the interface, we'll use a different approach
      // We'll check if the message is already marked for deletion by sender
      if (allRecipientsDeleted) {
        // If everyone has deleted the message, hard delete it
        await Message.findByIdAndDelete(id).session(session);
      } else {
        // Mark as deleted by sender (using a field that exists in the interface)
        // In a real implementation, you might want to add deletedBySender to your IMessage interface
        message.recipients = message.recipients.map(r => ({
          ...r,
          deleted: true // Mark all recipient entries as deleted
        }));
        await message.save({ session });
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      success: true,
      message: shouldHardDelete ? 'Message permanently deleted' : 'Message moved to trash'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error deleting message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
    res.status(500).json({ 
      success: false, 
      message: errorMessage
    });
  }
};
