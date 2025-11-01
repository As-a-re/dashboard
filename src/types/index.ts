import mongoose, { Document, Model, Types } from 'mongoose';

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  user_name?: string;
  role: 'admin' | 'user' | 'moderator' | 'manager' | 'department_head';
  department?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidatePassword: string): Promise<boolean>;
}

export interface IEvent {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  organizer: number | IUser;
  attendees: number[] | IUser[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registrationDeadline?: Date;
  maxAttendees?: number;
  createdAt: Date;
  updatedAt: Date;
  image?: string; 
  
  // Instance methods
  isRegistrationOpen: () => boolean;
  isFull: () => boolean;
}

export interface IDepartment extends Document {
  name: string;
  description?: string;
  head: Types.ObjectId | IUser;
  members: Types.ObjectId[] | IUser[];
  isActive: boolean;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  isDepartmentHead(userId: string): boolean;
  isMember(userId: string): boolean;
}

export interface IAttendance extends Document {
  event: Types.ObjectId | IEvent;
  user: Types.ObjectId | IUser;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkIn: Date;
  checkOut?: Date;
  notes?: string;
  markedBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinance extends Document {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  createdBy: Types.ObjectId | IUser;
  event?: Types.ObjectId | IEvent;
  department?: Types.ObjectId | IDepartment;
  attachments?: string[];
  paymentMethod?: string;
  reference?: string;
  status?: string;
  approved: boolean;
  approvedBy?: Types.ObjectId | IUser;
  approvalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinanceModel extends mongoose.Model<IFinance> {
  getFinancialSummary(query?: any): Promise<{
    income: number;
    expense: number;
    balance: number;
    totalTransactions: number;
  }>;
}

export interface IReport {
  id: number;
  title: string;
  content: string;
  type: 'event' | 'financial' | 'attendance' | 'other';
  generatedBy: number | IUser;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunication {
  id: number;
  title: string;
  content: string;
  sender: number | IUser;
  recipients: number[] | IUser[];
  readBy: number[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export interface IApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string | any;
  errors?: any[];
  timestamp: Date;
}
