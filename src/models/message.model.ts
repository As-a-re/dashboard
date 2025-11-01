import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types';

export interface IMessage extends Document {
  sender: IUser['_id'];
  recipients: {
    user: IUser['_id'];
    read: boolean;
    readAt?: Date;
    deleted: boolean;
  }[];
  subject: string;
  body: string;
  parentMessage?: IMessage['_id'];
  isThread: boolean;
  threadId?: IMessage['_id'];
  attachments: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  isPinned: boolean;
  isStarred: boolean;
  labels: string[];
  isDraft: boolean;
  scheduledAt?: Date;
  isReadByRecipient: boolean;
  metadata?: Record<string, any>;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipients: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      read: {
        type: Boolean,
        default: false
      },
      readAt: {
        type: Date
      },
      deleted: {
        type: Boolean,
        default: false
      }
    }],
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Subject cannot be more than 200 characters']
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    parentMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    isThread: {
      type: Boolean,
      default: false
    },
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      index: true
    },
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
    isPinned: {
      type: Boolean,
      default: false
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    labels: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    isDraft: {
      type: Boolean,
      default: false
    },
    scheduledAt: {
      type: Date,
      index: true
    },
    isReadByRecipient: {
      type: Boolean,
      default: false
    },
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
messageSchema.index({ 'recipients.user': 1, createdAt: -1 });
messageSchema.index({ 'recipients.read': 1 });
messageSchema.index({ isDraft: 1, sender: 1 });
messageSchema.index({ isThread: 1, threadId: 1 });
messageSchema.index({ scheduledAt: 1 }, { expireAfterSeconds: 0 }); // For scheduled messages

// Virtual for message preview
messageSchema.virtual('preview').get(function(this: IMessage) {
  return this.body.length > 100 ? this.body.substring(0, 100) + '...' : this.body;
});

// Virtual for reply count in thread
messageSchema.virtual('replyCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'threadId',
  count: true
});

// Pre-save hook to handle thread logic
messageSchema.pre<IMessage>('save', async function (next) {
  if (this.parentMessage && !this.threadId) {
    const parent = await mongoose.model<IMessage>('Message').findById(this.parentMessage);
    if (parent) {
      this.threadId = parent.threadId || parent._id;
      this.isThread = false;
    }
  }
  next();
});

// Post-save hook to update thread info on parent
messageSchema.post<IMessage>('save', async function (doc) {
  if (doc.isThread && !doc.threadId) {
    doc.threadId = doc._id;
    await doc.save();
  } else if (doc.parentMessage) {
    await mongoose.model<IMessage>('Message').updateOne(
      { _id: doc.parentMessage },
      { $set: { isThread: true } }
    );
  }
});


const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
