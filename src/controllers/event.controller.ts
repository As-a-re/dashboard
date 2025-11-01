import { Request, Response, NextFunction } from 'express';
import Event from '../models/event.model';
import { AppError } from '../middleware/error.middleware';
import { successResponse } from '../utils/apiResponse';
import { IEvent } from '../types';

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    // Create base query with proper type
    const findQuery = JSON.parse(queryStr);
    let query = Event.find<IEvent>(findQuery);

    // Sorting
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = (req.query.fields as string).split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // Pagination
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Event.countDocuments(findQuery);
    
    // Execute query with proper type casting
    const events = await query
      .skip(skip)
      .limit(limit)
      .populate<{ organizer: { _id: any; name: string; email: string } }>('organizer', 'name email')
      .populate<{ attendees: Array<{ _id: any; name: string; email: string }> }>('attendees', 'name email')
      .exec();

    successResponse(res, {
      results: events.length,
      data: events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }

    successResponse(res, { event });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Admin & Organizer
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Add organizer from the authenticated user
    req.body.organizer = req.user?.id;
    
    const event = await Event.create(req.body);
    
    successResponse(res, { event }, 'Event created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update event
// @route   PATCH /api/events/:id
// @access  Private/Admin & Organizer
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is the organizer or admin
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }
    
    if (event.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    successResponse(res, { event: updatedEvent }, 'Event updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin & Organizer
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }
    
    if (event.organizer.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to delete this event', 403));
    }

    await Event.findByIdAndDelete(req.params.id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for event
// @route   POST /api/events/:id/register
// @access  Private
export const registerForEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return next(new AppError('No event found with that ID', 404));
    }
    
    // Check if registration is open
    if (!event.isRegistrationOpen()) {
      return next(new AppError('Registration for this event is closed', 400));
    }
    
    // Check if event is full
    if (event.isFull()) {
      return next(new AppError('This event is already full', 400));
    }
    
    // Check if user is already registered
    if (event.attendees.includes(req.user?.id)) {
      return next(new AppError('You are already registered for this event', 400));
    }
    
    // Add user to attendees
    event.attendees.push(req.user?.id);
    await event.save();
    
    successResponse(res, null, 'Successfully registered for the event', 200);
  } catch (error) {
    next(error);
  }
};

// @desc    Get events by organizer
// @route   GET /api/events/organizer/:organizerId
// @access  Public
export const getEventsByOrganizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await Event.find({ organizer: req.params.organizerId })
      .populate('organizer', 'name email')
      .sort('-createdAt');
      
    successResponse(res, { results: events.length, events });
  } catch (error) {
    next(error);
  }
};
