# Gravity Hub - Backend

## Overview
This is the backend service for the Gravity Hub application, built with Node.js, Express, and MongoDB. It provides the API endpoints and business logic for the Gravity Hub platform.

## Features
- User authentication and authorization
- Role-based access control
- RESTful API endpoints
- MongoDB database integration
- Environment-based configuration
- Rate limiting and security headers
- API documentation

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher) or yarn
- MongoDB (v4.4 or higher)

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd gravity-hub/backend
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
1. Copy `.env.example` to `.env`
2. Update the environment variables in `.env` with your configuration:

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/gravity_hub
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
JWT_COOKIE_EXPIRES_IN=90
```

### 4. Start the development server
```bash
# Development mode with hot-reload
npm run dev

# Production mode
npm run build
npm start
```

The server will be running at `http://localhost:5000`

## API Documentation
Access the API documentation at: `http://localhost:5000/docs`

## Project Structure
```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express application
│   └── index.ts        # Server entry point
├── public/             # Static files
├── .env                # Environment variables
└── package.json
```

## Available Scripts
- `dev`: Start the development server with hot-reload
- `build`: Compile TypeScript to JavaScript
- `start`: Start the production server
- `test`: Run tests
- `lint`: Run ESLint
- `format`: Format code with Prettier

## Environment Variables
- `PORT`: Port to run the server on (default: 5000)
- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `JWT_EXPIRES_IN`: JWT expiration time (e.g., '15m' for 15 minutes)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration time (e.g., '7d' for 7 days)
- `NODE_ENV`: Environment (development/production)
- `JWT_COOKIE_EXPIRES_IN`: JWT cookie expiration in days

## Contributing
1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
