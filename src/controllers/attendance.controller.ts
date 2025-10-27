import { Request, Response, NextFunction } from 'express';
import Attendance from '../models/attendance.model';
import Event from '../models/event.model';
import { AppError } from '../middleware/error.middleware';
import { successResponse } from '../utils/apiResponse';

// @desc    Record attendance
// @route   POST /api/attendance
// @access  Private
export const recordAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event: eventId, user: userId, status = 'present', notes } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }

    // Check if user is registered for the event
    if (!event.attendees.includes(userId) && req.user?.role !== 'admin') {
      return next(new AppError('User is not registered for this event', 403));
    }

    // Check if attendance is already recorded
    const existingAttendance = await Attendance.findOne({
      event: eventId,
      user: userId
    });

    let attendance;
    
    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.notes = notes;
      existingAttendance.markedBy = req.user?.id;
      
      // If status is present, update check-in time
      if (status === 'present' && !existingAttendance.checkIn) {
        existingAttendance.checkIn = new Date();
      }
      
      await existingAttendance.save();
      attendance = existingAttendance;
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        event: eventId,
        user: userId,
        status,
        notes,
        markedBy: req.user?.id
      });
    }

    successResponse(res, { attendance }, 'Attendance recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance by event
// @route   GET /api/attendance/event/:eventId
// @access  Private
export const getAttendanceByEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }
    
    // Check if user is authorized (admin, event organizer, or department head)
    const isAuthorized = req.user?.role === 'admin' || 
                        event.organizer.toString() === req.user?.id ||
                        (req.user?.department && 
                         event.organizer.department?.toString() === req.user.department.toString() &&
                         req.user.role === 'department_head');
    
    if (!isAuthorized) {
      return next(new AppError('Not authorized to view attendance for this event', 403));
    }

    const attendance = await Attendance.find({ event: eventId })
      .populate('user', 'name email')
      .populate('markedBy', 'name')
      .sort('status');

    successResponse(res, { 
      results: attendance.length,
      data: attendance 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's attendance
// @route   GET /api/attendance/user/:userId
// @access  Private
export const getUserAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own attendance unless they're an admin/manager
    if (req.user?.id !== userId && !['admin', 'manager'].includes(req.user?.role || '')) {
      return next(new AppError('Not authorized to view this attendance record', 403));
    }

    const attendance = await Attendance.find({ user: userId })
      .populate('event', 'title startDate endDate')
      .populate('markedBy', 'name')
      .sort('-checkIn');

    successResponse(res, { 
      results: attendance.length,
      data: attendance 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check in user
// @route   POST /api/attendance/check-in
// @access  Private
export const checkIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.body;
    const userId = req.user?.id;

    // Check if event exists and is active
    const event = await Event.findOne({ 
      _id: eventId,
      status: { $in: ['upcoming', 'ongoing'] }
    });
    
    if (!event) {
      return next(new AppError('No active event found with that ID', 404));
    }

    // Check if user is registered for the event
    if (!event.attendees.includes(userId)) {
      return next(new AppError('You are not registered for this event', 403));
    }

    // Check if user is already checked in
    const existingCheckIn = await Attendance.findOne({
      event: eventId,
      user: userId,
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    if (existingCheckIn) {
      return next(new AppError('You are already checked in to this event', 400));
    }

    const attendance = await Attendance.create({
      event: eventId,
      user: userId,
      status: 'present',
      checkIn: new Date(),
      markedBy: userId // Self-check in
    });

    successResponse(res, { attendance }, 'Checked in successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Check out user
// @route   POST /api/attendance/check-out
// @access  Private
export const checkOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.body;
    const userId = req.user?.id;

    // Find active check-in
    const attendance = await Attendance.findOne({
      event: eventId,
      user: userId,
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    if (!attendance) {
      return next(new AppError('No active check-in found', 400));
    }

    attendance.checkOut = new Date();
    await attendance.save();

    successResponse(res, { attendance }, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats/:eventId
// @access  Private
export const getAttendanceStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }
    
    // Check if user is authorized (admin, event organizer, or department head)
    const isAuthorized = req.user?.role === 'admin' || 
                        event.organizer.toString() === req.user?.id ||
                        (req.user?.department && 
                         event.organizer.department?.toString() === req.user.department.toString() &&
                         req.user.role === 'department_head');
    
    if (!isAuthorized) {
      return next(new AppError('Not authorized to view attendance stats for this event', 403));
    }

    const stats = await Attendance.aggregate([
      {
        $match: { event: event._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      }
    ]);

    // Calculate percentages
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const statsWithPercentage = stats.map(stat => ({
      ...stat,
      percentage: total > 0 ? Math.round((stat.count / total) * 100) : 0
    }));

    successResponse(res, { 
      total,
      stats: statsWithPercentage 
    });
  } catch (error) {
    next(error);
  }
};
