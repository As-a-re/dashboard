import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types';

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Please provide department name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Department name cannot be more than 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    head: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide department head']
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    contactEmail: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    contactPhone: String
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
departmentSchema.index({ name: 'text', description: 'text' });

// Virtual for member count
departmentSchema.virtual('memberCount').get(function(this: IDepartment) {
  return this.members?.length || 0;
});

// Method to check if user is department head
departmentSchema.methods.isDepartmentHead = function(this: IDepartment, userId: string): boolean {
  return this.head.toString() === userId.toString();
};

// Method to check if user is a department member
departmentSchema.methods.isMember = function(this: IDepartment, userId: string): boolean {
  return this.members.some(member => member.toString() === userId.toString());
};

// Pre-save hook to ensure the head is also a member
const autoPopulateHead = function(this: any, next: Function) {
  if (this.isModified('head') || this.isNew) {
    if (this.head && !this.members.includes(this.head)) {
      this.members.push(this.head);
    }
  }
  next();
};

departmentSchema.pre('save', autoPopulateHead);

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;
