import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IReportTemplate extends Document {
  name: string;
  description?: string;
  type: 'financial' | 'attendance' | 'event' | 'user' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  template: any; // JSON structure defining the report layout and data
  defaultFilters: Record<string, any>;
  isPublic: boolean;
  createdBy: IUser['_id'];
  updatedBy: IUser['_id'];
  organization?: string;
  tags: string[];
  thumbnail?: string;
  version: number;
  isActive: boolean;
}

const reportTemplateSchema = new Schema<IReportTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    type: {
      type: String,
      required: true,
      enum: ['financial', 'attendance', 'event', 'user', 'custom']
    },
    format: {
      type: String,
      required: true,
      enum: ['pdf', 'excel', 'csv', 'json'],
      default: 'pdf'
    },
    template: {
      type: Schema.Types.Mixed,
      required: true
    },
    defaultFilters: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organization: {
      type: String,
      trim: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    thumbnail: {
      type: String,
      trim: true
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster querying
reportTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });
reportTemplateSchema.index({ type: 1, isPublic: 1 });
reportTemplateSchema.index({ createdBy: 1 });
reportTemplateSchema.index({ isActive: 1 });

// Pre-save hook to increment version on updates
reportTemplateSchema.pre('save', function(next) {
  if (this.isModified('template') || this.isModified('defaultFilters')) {
    this.version += 1;
  }
  next();
});

const ReportTemplate = mongoose.model<IReportTemplate>('ReportTemplate', reportTemplateSchema);

export default ReportTemplate;
