const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String
  },
  landId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Land',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    enum: ['cash', 'online', 'pending'],
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'due', 'refunded', 'partial_refund'],
    required: true
  },
  due: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    required: true
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundMode: {
    type: String,
    enum: ['cash', 'online']
  },
  refundDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
