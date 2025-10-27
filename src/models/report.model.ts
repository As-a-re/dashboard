import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IReport extends Document {
  title: string;
  description?: string;
  type: 'financial' | 'attendance' | 'event' | 'user' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    time: string; // HH:MM in 24h format
    timezone: string; // e.g., 'UTC', 'America/New_York'
    nextRun?: Date;
    lastRun?: Date;
    active: boolean;
  };
  template?: string; // Reference to template ID if using a template
  generatedBy: IUser['_id'];
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  metadata?: Record<string, any>;
  isPublic: boolean;
  recipients: {
    users: IUser['_id'][];
    roles: string[];
    emails: string[];
  };
}

const reportSchema = new Schema<IReport>(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
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
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {}
    },
    schedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        required: false
      },
      dayOfWeek: {
        type: Number,
        min: 0, // Sunday
        max: 6, // Saturday
        required: function() {
          return this.schedule?.frequency === 'weekly';
        }
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        required: function() {
          return this.schedule?.frequency === 'monthly';
        }
      },
      time: {
        type: String,
        required: function() {
          return !!this.schedule?.frequency;
        },
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format']
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      nextRun: Date,
      lastRun: Date,
      active: {
        type: Boolean,
        default: true
      }
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: false
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    error: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    recipients: {
      users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }],
      roles: [{
        type: String,
        enum: ['admin', 'manager', 'user', 'department_head']
      }],
      emails: [{
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
      }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster querying
reportSchema.index({ 'schedule.nextRun': 1 });
reportSchema.index({ 'schedule.active': 1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });

// Virtual for file download URL
reportSchema.virtual('downloadUrl').get(function(this: IReport) {
  if (!this.fileUrl) return null;
  return `/api/reports/${this._id}/download`;
});

// Pre-save hook to set next run time for scheduled reports
reportSchema.pre('save', function(next) {
  if (this.schedule?.active && this.schedule.frequency && this.schedule.time) {
    this.schedule.nextRun = calculateNextRun({
      frequency: this.schedule.frequency,
      dayOfWeek: this.schedule.dayOfWeek,
      dayOfMonth: this.schedule.dayOfMonth,
      time: this.schedule.time,
      timezone: this.schedule.timezone
    });
  }
  next();
});

// Helper function to calculate next run time
function calculateNextRun({
  frequency,
  dayOfWeek,
  dayOfMonth,
  time,
  timezone = 'UTC'
}: {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
}): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  
  // Create a date object for the next run
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  // Adjust for timezone if needed
  if (timezone !== 'UTC') {
    // This is a simplified example - in a real app, you'd use a library like moment-timezone
    const offset = 0; // Calculate timezone offset in minutes
    nextRun.setMinutes(nextRun.getMinutes() - offset);
  }
  
  // If the time has already passed today, move to the next occurrence
  if (nextRun <= now) {
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        // Handle month boundaries
        if (dayOfMonth) {
          const lastDayOfMonth = new Date(
            nextRun.getFullYear(),
            nextRun.getMonth() + 1,
            0
          ).getDate();
          nextRun.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
        break;
      // Add custom frequency handling if needed
    }
  }
  
  // For weekly reports, adjust to the correct day of the week
  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = nextRun.getDay();
    const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
    nextRun.setDate(nextRun.getDate() + daysToAdd);
  }
  
  return nextRun;
}

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;
