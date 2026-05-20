const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  accountNumber: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[A-Z]{2}\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid account number! Must be 2 letters followed by 10 digits.`
    }
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  mobile: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v) {
        return /^(\+\d{1,3}[- ]?)?\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid mobile number!`
    }
  },

  accountType: { 
    type: String, 
    enum: ['Savings', 'Current', 'Salary', 'NRI'], 
    default: 'Savings' 
  },
  accountBalance: { 
    type: Number, 
    required: true,
    min: [0, 'Account balance cannot be negative'],
    default: 0
  },

  // Credit Card Info
  creditCardStatus: { 
    type: String, 
    enum: ['Not Requested', 'In Progress', 'Delivered', 'Rejected'],
    default: 'Not Requested' 
  },
  creditCardLimit: { 
    type: Number,
    min: [0, 'Credit card limit cannot be negative']
  },
  creditCardFeatures: { 
    type: [String], 
    validate: {
      validator: function(v) {
        return v.every(feature => typeof feature === 'string');
      },
      message: 'Credit card features must be strings'
    }
  },

  // Cheque Info
  chequeBookStatus: { 
    type: String, 
    enum: ['Not Requested', 'In Progress', 'Delivered', 'Rejected'],
    default: 'Not Requested' 
  },
  chequeIssuedDate: { type: Date },

  // Loan Info
  loanStatus: { 
    type: String, 
    enum: ['No Active Loan', 'In Progress', 'Approved', 'Rejected'],
    default: 'No Active Loan' 
  },
  loanType: { 
    type: String,
    enum: ['Home', 'Personal', 'Auto', 'Education', null]
  },
  loanAmount: { 
    type: Number,
    min: [0, 'Loan amount cannot be negative']
  },
  loanEMI: { 
    type: Number,
    min: [0, 'EMI amount cannot be negative']
  },

  // KYC & Security
  kycStatus: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending' 
  },
  lastKYCUpdate: { type: Date },
  securityAlerts: [String],

  // Transactions (optional)
  recentTransactions: [{
    date: { type: Date, default: Date.now },
    description: { 
      type: String, 
      trim: true,
      required: true 
    },
    amount: { 
      type: Number, 
      required: true,
      min: [0, 'Transaction amount cannot be negative']
    },
    type: { 
      type: String, 
      enum: ['Credit', 'Debit'],
      required: true 
    }
  }],

  // Misc
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true  // Automatically manage createdAt and updatedAt
});

// Compound index for faster queries
customerSchema.index({ accountNumber: 1, name: 1 });

// Method to add a transaction
customerSchema.methods.addTransaction = function(description, amount, type) {
  if (type !== 'Credit' && type !== 'Debit') {
    throw new Error('Transaction type must be either Credit or Debit');
  }

  this.recentTransactions.push({
    description,
    amount,
    type
  });

  // Update account balance based on transaction type
  if (type === 'Credit') {
    this.accountBalance += amount;
  } else {
    this.accountBalance -= amount;
  }

  return this.save();
};

// Validation hook to ensure loan details are consistent
customerSchema.pre('save', function(next) {
  if (this.loanStatus === 'No Active Loan') {
    this.loanType = null;
    this.loanAmount = undefined;
    this.loanEMI = undefined;
  } else if (this.loanStatus === 'Approved') {
    if (!this.loanType || !this.loanAmount || !this.loanEMI) {
      next(new Error('Loan details must be complete for approved loans'));
    }
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);