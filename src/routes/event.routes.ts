import { Router, Request, Response } from 'express';
import { authenticateJWT, checkRole } from '../middleware/auth.middleware';
import { IUser } from '../types';

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
 * @route   GET /api/events
 * @desc    Get all events
 * @access  Private
 */
router.get('/', (req: Request, res: Response) => {
  // In a real app, you would fetch events from the database
  // and apply filters, sorting, and pagination
  res.json({ 
    message: 'Get all events',
    events: []
  });
});

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Private
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // In a real app, you would fetch the event by ID from the database
  res.json({ 
    message: `Get event with ID: ${id}`,
    event: { id }
  });
});

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (Admin, Event Manager)
 */
router.post('/', checkRole(['admin', 'event_manager']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // In a real app, you would validate the request body and create the event
  res.status(201).json({ 
    message: 'Event created',
    event: req.body
  });
});

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event
 * @access  Private (Admin, Event Manager)
 */
router.put('/:id', checkRole(['admin', 'event_manager']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id } = req.params;
  // In a real app, you would update the event in the database
  res.json({ 
    message: `Updated event with ID: ${id}`,
    event: { id, ...req.body }
  });
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event
 * @access  Private (Admin)
 */
router.delete('/:id', checkRole(['admin']), (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id } = req.params;
  // In a real app, you would delete the event from the database
  res.json({ 
    message: `Deleted event with ID: ${id}`,
    id
  });
});

/**
 * @route   POST /api/events/:id/register
 * @desc    Register for an event
 * @access  Private
 */
router.post('/:id/register', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id: eventId } = req.params;
  const userId = req.user.id;
  
  // In a real app, you would register the user for the event
  res.json({ 
    message: `User ${userId} registered for event ${eventId}`,
    eventId,
    userId
  });
});

/**
 * @route   GET /api/events/:id/attendees
 * @desc    Get event attendees
 * @access  Private
 */
router.get('/:id/attendees', (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { id: eventId } = req.params;
  // In a real app, you would fetch the attendees from the database
  res.json({ 
    message: `Get attendees for event with ID: ${eventId}`,
    eventId,
    attendees: []
  });
});

export default router;
