import { Request, Response, NextFunction } from 'express';
import Department from '../models/department.model';
import { AppError } from '../middleware/error.middleware';
import { successResponse } from '../utils/apiResponse';

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    let query = Department.find(queryObj)
      .populate('head', 'name email')
      .populate('members', 'name email role');

    // Sorting
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('name');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = (req.query.fields as string).split(',').join(' ');
      query = query.select(fields);
    }

    // Pagination
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Department.countDocuments(queryObj);
    query = query.skip(skip).limit(limit);

    const departments = await query;

    successResponse(res, {
      results: departments.length,
      data: departments,
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

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Public
export const getDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'name email')
      .populate('members', 'name email role');

    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }

    successResponse(res, { department });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only admins can create departments
    if (req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to create departments', 403));
    }

    const department = await Department.create(req.body);
    
    successResponse(res, { department }, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PATCH /api/departments/:id
// @access  Private/Admin & Department Head
export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }
    
    // Check if user is admin or department head
    if (req.user?.role !== 'admin' && !department.isDepartmentHead(req.user?.id)) {
      return next(new AppError('Not authorized to update this department', 403));
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
    .populate('head', 'name email')
    .populate('members', 'name email role');

    successResponse(res, { department: updatedDepartment }, 'Department updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only admins can delete departments
    if (req.user?.role !== 'admin') {
      return next(new AppError('Not authorized to delete departments', 403));
    }

    const department = await Department.findByIdAndDelete(req.params.id);
    
    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to department
// @route   POST /api/departments/:id/members
// @access  Private/Admin & Department Head
export const addDepartmentMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return next(new AppError('Please provide user ID', 400));
    }

    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }
    
    // Check if user is admin or department head
    if (req.user?.role !== 'admin' && !department.isDepartmentHead(req.user?.id)) {
      return next(new AppError('Not authorized to add members to this department', 403));
    }
    
    // Check if user is already a member
    if (department.members.includes(userId)) {
      return next(new AppError('User is already a member of this department', 400));
    }
    
    department.members.push(userId);
    await department.save();
    
    successResponse(res, null, 'Member added to department successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from department
// @route   DELETE /api/departments/:id/members/:userId
// @access  Private/Admin & Department Head
export const removeDepartmentMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(new AppError('No department found with that ID', 404));
    }
    
    // Check if user is admin or department head
    if (req.user?.role !== 'admin' && !department.isDepartmentHead(req.user?.id)) {
      return next(new AppError('Not authorized to remove members from this department', 403));
    }
    
    // Prevent removing department head
    if (department.head.toString() === userId) {
      return next(new AppError('Cannot remove department head. Assign a new head first.', 400));
    }
    
    // Remove user from members array
    department.members = department.members.filter(member => {
      const memberId = typeof member === 'object' && member !== null && '_id' in member 
        ? member._id.toString() 
        : member.toString();
      return memberId !== userId;
    }) as any; 
    
    await department.save();
    
    successResponse(res, null, 'Member removed from department successfully');
  } catch (error) {
    next(error);
  }
};
