import mongoose, { Schema } from 'mongoose';
import { IFinance, IFinanceModel } from '../types';

const financeSchema = new Schema<IFinance>(
  {
    type: {
      type: String,
      required: [true, 'Please specify income or expense'],
      enum: ['income', 'expense']
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0, 'Amount cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'other'],
      default: 'other'
    },
    reference: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event'
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    attachments: [{
      url: String,
      name: String,
      type: String
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster querying
financeSchema.index({ type: 1, date: -1 });
financeSchema.index({ category: 1 });
financeSchema.index({ event: 1 });
financeSchema.index({ department: 1 });

// Virtual for formatted amount (e.g., adding currency symbol)
financeSchema.virtual('formattedAmount').get(function(this: IFinance) {
  return `$${this.amount.toFixed(2)}`;
});

// Pre-save hook to ensure either event or department is provided for expenses
financeSchema.pre('save', function(next) {
  if (this.type === 'expense' && !this.event && !this.department) {
    return next(new Error('Expenses must be associated with an event or department'));
  }
  next();
});

// Static method to get financial summary
financeSchema.statics.getFinancialSummary = async function(query = {}) {
  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'income'] }, '$total', 0]
          }
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ['$_id', 'expense'] }, '$total', 0]
          }
        },
        totalTransactions: { $sum: '$count' }
      }
    },
    {
      $project: {
        _id: 0,
        income: { $ifNull: ['$income', 0] },
        expense: { $ifNull: ['$expense', 0] },
        balance: { $subtract: ['$income', { $abs: '$expense' }] },
        totalTransactions: 1
      }
    }
  ]);

  return result[0] || { income: 0, expense: 0, balance: 0, totalTransactions: 0 };
};

const Finance = mongoose.model<IFinance, IFinanceModel>('Finance', financeSchema);

export default Finance;
