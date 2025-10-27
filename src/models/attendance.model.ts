import mongoose, { Schema, Document } from 'mongoose';
import { IAttendance, IUser, IEvent } from '../types';

// Define the document interface (includes IAttendance and mongoose.Document)
interface IAttendanceDocument extends IAttendance, Document {}

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Please provide event ID']
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user ID']
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present'
    },
    checkIn: {
      type: Date,
      default: Date.now
    },
    checkOut: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide who marked the attendance']
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index to ensure one attendance record per user per event
attendanceSchema.index({ event: 1, user: 1 }, { unique: true });

// Virtual for duration in minutes
attendanceSchema.virtual('durationInMinutes').get(function(this: IAttendance) {
  if (!this.checkOut || !this.checkIn) return 0;
  const duration = this.checkOut.getTime() - this.checkIn.getTime();
  return Math.round(duration / (1000 * 60));
});

// Pre-save hook to update check-out time if status is changed to 'absent' or 'excused'
attendanceSchema.pre('save', function(next) {
  if (this.isModified('status') && (this.status === 'absent' || this.status === 'excused')) {
    this.checkOut = new Date();
  }
  next();
});

// Add a virtual for duration
attendanceSchema.virtual('duration').get(function(this: IAttendanceDocument) {
  if (!this.checkIn || !this.checkOut) return 0;
  return this.checkOut.getTime() - this.checkIn.getTime();
});

// Add index for common queries
attendanceSchema.index({ event: 1, user: 1 }, { unique: true });
attendanceSchema.index({ user: 1, checkIn: -1 });
attendanceSchema.index({ markedBy: 1, checkIn: -1 });

// Pre-save hook to ensure checkOut is after checkIn
attendanceSchema.pre<IAttendanceDocument>('save', function(next) {
  if (this.checkOut && this.checkIn && this.checkOut < this.checkIn) {
    throw new Error('checkOut must be after checkIn');
  }
  next();
});

const Attendance = mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);

export default Attendance;
