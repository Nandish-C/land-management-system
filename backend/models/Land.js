const mongoose = require('mongoose');

const landSchema = new mongoose.Schema({
  landId: {
    type: String
  },
  size: {
    type: String,
    default: ''
  },
  owner: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  soldDate: {
    type: Date
  },
  pricePerMonth: {
    type: Number,
    default: 0
  },
  installmentTotal: {
    type: Number,
    default: 0
  },
  details: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  assignedEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'completed'],
    default: 'sold'
  },
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    address: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Land', landSchema);
