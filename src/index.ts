import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Routes
import departmentRoutes from './routes/department.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import attendanceRoutes from './routes/attendance.routes';
import financeRoutes from './routes/finance.routes';
import communicationRoutes from './routes/communication.routes';
import reportRoutes from './routes/report.routes';
import authRoutes from './routes/auth.routes';
import announcementRoutes from './routes/announcements.routes';
import notificationRoutes from './routes/notifications.routes';
import messageRoutes from './routes/message.routes';

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/graviti_hub';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// API Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
