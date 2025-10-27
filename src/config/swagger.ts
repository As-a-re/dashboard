import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';
import path from 'path';

// Define the Swagger specification type
interface SwaggerSpec {
  paths: {
    [key: string]: any;
  };
  [key: string]: any;
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gravity Hub API Documentation',
      version,
      description: 'API documentation for Gravity Hub backend services',
      contact: {
        name: 'Gravity Hub Support',
        email: 'support@gravityhub.com',
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../models/*.ts'),
    path.join(__dirname, '../interfaces/*.ts'),
  ],
};

const specs = swaggerJsdoc(options) as SwaggerSpec;

export default specs;
