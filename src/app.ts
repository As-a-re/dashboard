import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { IApiResponse } from './types';
import errorHandler from './middleware/error.middleware';
import connectDB from './config/db';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import departmentRoutes from './routes/department.routes';
import attendanceRoutes from './routes/attendance.routes';
import financeRoutes from './routes/finance.routes';
import reportRoutes from './routes/report.routes';
import communicationRoutes from './routes/communication.routes';

// Initialize express app
const app: Application = express();

// Connect to MongoDB
connectDB();

// Set security HTTP headers
app.use(helmet());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve documentation at /docs
app.get('/docs', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/doc.html'));
});

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Import rate limiters
import { authLimiter, apiLimiter, publicLimiter } from './config/rateLimiter';

// Apply rate limiting to API routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh-token', authLimiter);
app.use('/api', apiLimiter);

// Apply public rate limiting to non-API routes
app.use(publicLimiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());


// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);


// Enable CORS
app.use(cors());
app.options('*', cors());

// Compress all responses
app.use(compression());

// Test middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = new Date().toISOString();
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/communication', communicationRoutes);



// Test route to verify static files
app.get('/test-doc', (req: Request, res: Response) => {
    res.send('Test route is working!');
});

// Serve documentation
app.get('/docs', (req: Request, res: Response) => {
    const filePath = path.join(__dirname, '../../public/doc.html');
    console.log('Attempting to serve file from:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error serving doc.html:', err);
            res.status(500).send('Error loading documentation');
        }
    });
});

// Handle 404 - Route not found
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  const response: IApiResponse<null> = {
    success: false,
    statusCode: 404,
    message: `Can't find ${req.originalUrl} on this server!`,
    timestamp: new Date(),
    data: null
  };
  res.status(404).json(response);
});

// Error handling middleware
app.use(errorHandler);

export default app;
