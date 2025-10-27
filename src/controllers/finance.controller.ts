import { Request, Response, NextFunction } from 'express';
import Finance from '../models/finance.model';
import { AppError } from '../middleware/error.middleware';
import { successResponse } from '../utils/apiResponse';
import mongoose from 'mongoose';

// @desc    Create a financial record
// @route   POST /api/finance
// @access  Private
export const createFinanceRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, amount, category, description, date, paymentMethod, reference, event, department } = req.body;
    
    // Basic validation
    if (type === 'expense' && !event && !department) {
      return next(new AppError('Expenses must be associated with an event or department', 400));
    }

    const financeRecord = await Finance.create({
      type,
      amount,
      category,
      description,
      date: date || Date.now(),
      paymentMethod: paymentMethod || 'other',
      reference,
      event,
      department,
      createdBy: req.user?.id,
      status: 'completed' // Default status
    });

    successResponse(res, { financeRecord }, 'Financial record created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all financial records with filtering
// @route   GET /api/finance
// @access  Private
export const getFinanceRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 2) Advanced filtering (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Finance.find(JSON.parse(queryStr))
      .populate('createdBy', 'name email')
      .populate('event', 'title')
      .populate('department', 'name');

    // 3) Sorting
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // 4) Field limiting
    if (req.query.fields) {
      const fields = (req.query.fields as string).split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // 5) Pagination
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;
    
    const total = await Finance.countDocuments(JSON.parse(queryStr));
    query = query.skip(skip).limit(limit);

    const financeRecords = await query;

    // 6) Get financial summary
    const summary = await Finance.getFinancialSummary(JSON.parse(queryStr));

    successResponse(res, {
      results: financeRecords.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      summary,
      data: financeRecords
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial record by ID
// @route   GET /api/finance/:id
// @access  Private
export const getFinanceRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const financeRecord = await Finance.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('event', 'title')
      .populate('department', 'name');

    if (!financeRecord) {
      return next(new AppError('No financial record found with that ID', 404));
    }

    successResponse(res, { financeRecord });
  } catch (error) {
    next(error);
  }
};

// @desc    Update financial record
// @route   PATCH /api/finance/:id
// @access  Private
export const updateFinanceRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, amount, category, description, date, paymentMethod, reference, status } = req.body;

    // Check if record exists
    const existingRecord = await Finance.findById(req.params.id);
    if (!existingRecord) {
      return next(new AppError('No financial record found with that ID', 404));
    }

    // Check if user has permission to update
    if (existingRecord.createdBy.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to update this record', 403));
    }

    // Prevent changing record type if it would violate constraints
    if (type && type !== existingRecord.type && type === 'expense' && !existingRecord.event && !existingRecord.department) {
      return next(new AppError('Cannot change to expense type without associating with an event or department', 400));
    }

    const updatedRecord = await Finance.findByIdAndUpdate(
      req.params.id,
      {
        type,
        amount,
        category,
        description,
        date,
        paymentMethod,
        reference,
        status
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('createdBy', 'name email')
      .populate('event', 'title')
      .populate('department', 'name');

    successResponse(res, { financeRecord: updatedRecord }, 'Financial record updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete financial record
// @route   DELETE /api/finance/:id
// @access  Private
export const deleteFinanceRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await Finance.findById(req.params.id);
    
    if (!record) {
      return next(new AppError('No financial record found with that ID', 404));
    }

    // Check if user has permission to delete
    if (record.createdBy.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to delete this record', 403));
    }

    await Finance.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial summary
// @route   GET /api/finance/summary
// @access  Private
export const getFinanceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, event, department } = req.query;
    
    const match: any = {};
    
    // Date range filter
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate as string);
      if (endDate) match.date.$lte = new Date(endDate as string);
    }
    
    // Event filter
    if (event) {
      match.event = new mongoose.Types.ObjectId(event as string);
    }
    
    // Department filter
    if (department) {
      match.department = new mongoose.Types.ObjectId(department as string);
    }
    
    // Get summary
    const summary = await Finance.getFinancialSummary(match);
    
    // Get top categories
    const categories = await Finance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          type: { $first: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Get recent transactions
    const recentTransactions = await Finance.find(match)
      .sort('-date')
      .limit(5)
      .populate('event', 'title')
      .populate('department', 'name');

    successResponse(res, {
      summary,
      topCategories: categories,
      recentTransactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial statistics
// @route   GET /api/finance/stats
// @access  Private
export const getFinanceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const match: any = {};
    
    // Date range filter
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate as string);
      if (endDate) match.date.$lte = new Date(endDate as string);
    }
    
    // Group by time period
    let groupByFormat;
    switch (groupBy) {
      case 'day':
        groupByFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupByFormat = '%Y-%U';
        break;
      case 'year':
        groupByFormat = '%Y';
        break;
      case 'month':
      default:
        groupByFormat = '%Y-%m';
    }
    
    const stats = await Finance.aggregate([
      { $match: match },
      {
        $project: {
          type: 1,
          amount: 1,
          date: 1,
          yearMonthDay: { $dateToString: { format: groupByFormat, date: '$date' } }
        }
      },
      {
        $group: {
          _id: {
            date: '$yearMonthDay',
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          data: {
            $push: {
              type: '$_id.type',
              total: '$total',
              count: '$count'
            }
          },
          totalAmount: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    successResponse(res, { stats });
  } catch (error) {
    next(error);
  }
};
