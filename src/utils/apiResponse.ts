import { Response } from 'express';
import { IApiResponse } from '../types';

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = 'Operation successful',
  statusCode: number = 200
): void => {
  const response: IApiResponse = {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date(),
  };
  
  res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 500,
  error: any = null
): void => {
  const response: IApiResponse = {
    success: false,
    statusCode,
    message,
    error: error?.message || message,
    timestamp: new Date(),
  };
  
  res.status(statusCode).json(response);
};

export const notFoundResponse = (res: Response, message: string = 'Resource not found'): void => {
  errorResponse(res, message, 404);
};

export const validationErrorResponse = (res: Response, errors: any[]): void => {
  const response: IApiResponse = {
    success: false,
    statusCode: 400,
    message: 'Validation failed',
    error: 'Validation Error',
    errors,
    timestamp: new Date(),
  };
  
  res.status(400).json(response);
};

export const unauthorizedResponse = (res: Response, message: string = 'Unauthorized'): void => {
  errorResponse(res, message, 401);
};

export const forbiddenResponse = (res: Response, message: string = 'Forbidden'): void => {
  errorResponse(res, message, 403);
};
