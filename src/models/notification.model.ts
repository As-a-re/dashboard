import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export type NotificationType = 
  | 'message' 
  | 'announcement' 
  | 'event' 
  | 'system' 
  | 'report' 
  | 'approval' 
  | 'reminder';

export interface INotification extends Document {
  user: IUser['_id'];
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: mongoose.Types.ObjectId;
  relatedType?: string;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
  data?: Record<string, any>;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot be more than 1000 characters']
    },
    type: {
      type: String,
      required: true,
      enum: ['message', 'announcement', 'event', 'system', 'report', 'approval', 'reminder'],
      default: 'system'
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    relatedType: {
      type: String,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    actionUrl: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 } // TTL index for automatic cleanup
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster querying
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ relatedId: 1, relatedType: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 0 }); // For TTL

// Virtual for time since creation
notificationSchema.virtual('timeAgo').get(function(this: INotification) {
  const seconds = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  } as const;
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'Just now';
});

// Pre-save hook to set readAt timestamp
notificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
