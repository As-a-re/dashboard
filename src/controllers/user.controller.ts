import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { IApiResponse } from '../types';

const createSendToken = (user: any, statusCode: number, res: Response) => {
  const token = user.generateAuthToken();
  const userObj = user.toObject();
  delete userObj.password;
  
  const response: IApiResponse = {
    success: true,
    statusCode,
    message: 'Operation successful',
    data: {
      user: userObj,
      token,
    },
    timestamp: new Date(),
  };

  res.status(statusCode).json(response);
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Create new user
    const newUser = new User({
      email,
      password,
      name,
      role,
    });
    
    await newUser.save();
    createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await (user as any).comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    const response: IApiResponse = {
      success: true,
      statusCode: 200,
      message: 'User retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    // 1) Create error if user POSTs password data
    if (req.body.password) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }

    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = { ...req.body };
    const allowedFields = ['name', 'email'];
    Object.keys(filteredBody).forEach(
      (el) => !allowedFields.includes(el) && delete filteredBody[el]
    );

    // 3) Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    const response: IApiResponse = {
      success: true,
      statusCode: 200,
      message: 'User updated successfully',
      data: {
        user: updatedUser,
      },
      timestamp: new Date(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Admin only
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find();

    const response: IApiResponse = {
      success: true,
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: {
        users,
      },
      timestamp: new Date(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    const response: IApiResponse = {
      success: true,
      statusCode: 200,
      message: 'User retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    const response: IApiResponse = {
      success: true,
      statusCode: 200,
      message: 'User updated successfully',
      data: {
        user,
      },
      timestamp: new Date(),
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
