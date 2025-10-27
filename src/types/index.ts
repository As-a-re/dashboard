import { Document, Types } from 'mongoose';

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
  role: 'admin' | 'user' | 'moderator';
  department?: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartment {
  id: number;
  name: string;
  description?: string;
  head: number | IUser;
  members: number[] | IUser[];
  createdAt: Date;
  updatedAt: Date;
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

export interface IFinance {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  recordedBy: number | IUser;
  approved: boolean;
  approvedBy?: number | IUser;
  approvalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
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
