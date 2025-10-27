import mongoose, { Schema } from 'mongoose';
import { IEvent } from '../types';

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Please provide event title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide event description'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide end date'],
      validate: {
        validator: function(this: IEvent, value: Date) {
          return value > this.startDate;
        },
        message: 'End date must be after start date'
      }
    },
    location: {
      type: String,
      required: [true, 'Please provide event location']
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide organizer']
    },
    attendees: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    image: String,
    maxAttendees: {
      type: Number,
      min: [1, 'Maximum attendees must be at least 1']
    },
    registrationDeadline: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
eventSchema.index({ startDate: 1 });
eventSchema.index({ status: 1 });

// Virtual for event duration in hours
eventSchema.virtual('durationInHours').get(function(this: IEvent) {
  if (!this.endDate || !this.startDate) return 0;
  const duration = this.endDate.getTime() - this.startDate.getTime();
  return Math.round(duration / (1000 * 60 * 60));
});

// Check if registration is open
eventSchema.methods.isRegistrationOpen = function(this: IEvent): boolean {
  if (this.registrationDeadline) {
    return new Date() < this.registrationDeadline;
  }
  return true;
};

// Check if event is full
eventSchema.methods.isFull = function(this: IEvent): boolean {
  if (this.maxAttendees && this.attendees) {
    return this.attendees.length >= this.maxAttendees;
  }
  return false;
};

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
