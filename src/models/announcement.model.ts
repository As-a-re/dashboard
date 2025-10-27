import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: IUser['_id'];
  status: 'draft' | 'published' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: Date;
  endDate?: Date;
  isPinned: boolean;
  targetAudience: {
    allUsers: boolean;
    roles?: string[];
    departments?: mongoose.Types.ObjectId[];
    users?: IUser['_id'][];
  };
  readBy: {
    user: IUser['_id'];
    readAt: Date;
  }[];
  attachments: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  metadata?: Record<string, any>;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(this: IAnnouncement, value: Date) {
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    targetAudience: {
      allUsers: {
        type: Boolean,
        default: true
      },
      roles: [{
        type: String,
        enum: ['admin', 'manager', 'user', 'department_head']
      }],
      departments: [{
        type: Schema.Types.ObjectId,
        ref: 'Department'
      }],
      users: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    readBy: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    attachments: [{
      url: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true
      }
    }],
    metadata: {
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
announcementSchema.index({ status: 1, startDate: -1 });
announcementSchema.index({ isPinned: -1, startDate: -1 });
announcementSchema.index({ 'targetAudience.users': 1 });
announcementSchema.index({ 'targetAudience.departments': 1 });
announcementSchema.index({ 'targetAudience.roles': 1 });
announcementSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 }); // For auto-archiving

// Virtual for announcement status
announcementSchema.virtual('isActive').get(function(this: IAnnouncement) {
  if (this.status !== 'published') return false;
  const now = new Date();
  return (!this.startDate || this.startDate <= now) && 
         (!this.endDate || this.endDate >= now);
});

// Virtual for read status (for a specific user)
announcementSchema.virtual('isRead').get(function(this: IAnnouncement) {
  if (!this.readBy || !this.readBy.length) return false;
  // This would be populated by the controller for a specific user
  return false;
});

// Pre-save hook to validate target audience
announcementSchema.pre('save', function(next) {
  const { allUsers, roles, departments, users } = this.targetAudience;
  
  if (!allUsers && (!roles || !roles.length) && 
      (!departments || !departments.length) && 
      (!users || !users.length)) {
    return next(new Error('At least one target audience must be specified'));
  }
  
  next();
});

// Static method to get active announcements for a user
announcementSchema.statics.getActiveAnnouncements = async function(userId: string, userRoles: string[] = [], departmentId?: string) {
  const now = new Date();
  
  return this.find({
    status: 'published',
    startDate: { $lte: now },
    $or: [
      { 'targetAudience.allUsers': true },
      { 'targetAudience.roles': { $in: userRoles } },
      { 'targetAudience.departments': departmentId },
      { 'targetAudience.users': userId }
    ],
    $and: [
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      }
    ]
  })
  .sort({ isPinned: -1, startDate: -1 });
};

const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);

export default Announcement;
