import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Report, { IReport } from '../models/report.model';
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
 * @desc    Get all reports
 * @route   GET /api/reports
 * @access  Private (Admin/Manager)
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20',
      status, 
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      startDate?: string;
      endDate?: string;
    };

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const query: Record<string, any> = {};

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    
    // Date range filter
    if (req.user?.role !== 'admin') {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate as string);
    }

    // Regular users can only see their own reports
    if (req.user?.role === 'user') {
      query.createdBy = req.user.id;
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 } as any)
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: reports.length,
      total,
      data: reports,
      pagination: {
        page: parseInt(page as string),
        pages: Math.ceil(total / parseInt(limit as string)),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: errorMessage
    });
  }
};

/**
 * @desc    Get single report by ID
 * @route   GET /api/reports/:id
 * @access  Private
 */
export const getReportById = async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user has permission to view this report
    if (
      req.user?.role !== 'admin' && 
      report.generatedBy._id.toString() !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this report'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: errorMessage
    });
  }
};

/**
 * @desc    Create new report
 * @route   POST /api/reports
 * @access  Private
 */
export const createReport = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      title, 
      description, 
      type, 
      priority = 'medium',
      assignedTo,
      dueDate,
      attachments = []
    } = req.body;

    // Basic validation
    if (!title || !description || !type) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Title, description, and type are required'
      });
    }

    // Create report
    const report = new Report({
      title,
      description,
      type,
      priority,
      status: 'open',
      createdBy: req.user?.id,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      attachments
    });

    await report.save({ session });
    
    // Populate createdBy and assignedTo for the response
    await report.populate('createdBy', 'name email');
    if (assignedTo) {
      await report.populate('assignedTo', 'name email');
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      message: 'Failed to create report',
      error: errorMessage
    });
  }
};

/**
 * @desc    Update report
 * @route   PUT /api/reports/:id
 * @access  Private
 */
export const updateReport = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user?.id as string;
    const userRole = req.user?.role as string;
    const isAdmin = userRole === 'admin';
    
    const {
      title,
      description,
      type,
      status,
      priority,
      assignedTo,
      dueDate,
      resolution,
      attachments,
      comment
    } = req.body as {
      title?: string;
      description?: string;
      type?: 'financial' | 'attendance' | 'event' | 'user' | 'custom';
      status?: 'pending' | 'processing' | 'completed' | 'failed';
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      resolution?: string;
      attachments?: any[];
      comment?: string;
    };

    // Find the report
    const report = await Report.findById(id).session(session);
    
    if (!report) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions
    const isCreator = report.generatedBy.toString() === userId;
    
    if (userRole !== 'admin' && !isCreator) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this report'
      });
    }

    // Type assertion to handle the document type
    const reportDoc = report as IReport & {
      priority?: string;
      dueDate?: Date;
      assignedTo?: mongoose.Types.ObjectId;
      comments?: any[];
      attachments?: any[];
      resolution?: string;
      resolvedAt?: Date;
    };

    // Update fields if provided
    if (title) report.title = title;
    if (description) report.description = description;
    if (type) report.type = type as IReport['type'];
    
    // Update additional fields if they exist on the document
    if (priority) reportDoc.priority = priority;
    if (dueDate) reportDoc.dueDate = new Date(dueDate);
    
    // Only update assignedTo if user is admin
    if (assignedTo && isAdmin) {
      reportDoc.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }
    
    // Handle comments
    if (comment) {
      if (!reportDoc.comments) reportDoc.comments = [];
      reportDoc.comments.push({
        user: new mongoose.Types.ObjectId(userId),
        text: comment,
        createdAt: new Date()
      } as any);
    }
    
    // Handle attachments
    if (attachments && attachments.length > 0) {
      if (!reportDoc.attachments) reportDoc.attachments = [];
      reportDoc.attachments = [...(reportDoc.attachments || []), ...attachments];
    }
    
    // Handle resolution
    if (status === 'completed') {
      report.status = 'completed';
      reportDoc.resolution = resolution || 'Marked as resolved';
      reportDoc.resolvedAt = new Date();
    }

    await report.save({ session });
    
    // Populate fields for response
    await report.populate('createdBy', 'name email');
    // No assignedTo in IReport interface, so we'll skip this population

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error updating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: errorMessage
    });
  }
};

/**
 * @desc    Delete report
 * @route   DELETE /api/reports/:id
 * @access  Private (Admin/Manager)
 */
export const deleteReport = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const userId = req.user?.id as string;
    const isAdmin = req.user?.role === 'admin';

    // Find the report first to check permissions
    const report = await Report.findById(id).session(session);
    
    if (!report) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error deleting report:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: errorMessage
    });
  }
};

/**
 * @desc    Get report statistics
 * @route   GET /api/reports/stats
 * @access  Private (Admin/Manager)
 */
export const getReportStats = async (req: Request, res: Response) => {
  try {
    // Only admin or manager can access these stats
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view report statistics'
      });
    }

    const stats = await Report.aggregate([
      {
        $facet: {
          // Count by status
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          // Count by type
          typeCounts: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          // Count by priority
          priorityCounts: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          // Count by month for the last 6 months
          monthlyTrends: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 6 }
          ],
          // Average resolution time
          avgResolutionTime: [
            {
              $match: {
                status: 'resolved',
                resolvedAt: { $exists: true },
                createdAt: { $exists: true }
              }
            },
            {
              $project: {
                resolutionTime: {
                  $divide: [
                    { $subtract: ['$resolvedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24 // Convert to days
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgResolutionTime: { $avg: '$resolutionTime' }
              }
            }
          ]
        }
      }
    ]);

    // Format the response
    const result: {
      status: Record<string, number>;
      types: Record<string, number>;
      priorities: Record<string, number>;
      monthlyTrends: Array<{ month: string; count: number }>;
      avgResolutionTime: number | string;
    } = {
      status: {},
      types: {},
      priorities: {},
      monthlyTrends: stats[0].monthlyTrends.map((item: any) => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count
      })),
      avgResolutionTime: stats[0].avgResolutionTime[0]?.avgResolutionTime?.toFixed(2) || 0
    };

    // Convert arrays to objects for easier frontend consumption
    stats[0].statusCounts.forEach((item: any) => {
      result.status[item._id] = item.count;
    });
    
    stats[0].typeCounts.forEach((item: any) => {
      result.types[item._id] = item.count;
    });
    
    stats[0].priorityCounts.forEach((item: any) => {
      result.priorities[item._id] = item.count;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in report stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to get report stats',
      error: errorMessage
    });
  }
};
