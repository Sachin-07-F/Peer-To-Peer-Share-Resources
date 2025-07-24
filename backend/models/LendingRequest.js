const mongoose = require('mongoose');

const lendingRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['textbooks', 'electronics', 'lab', 'notes', 'tools', 'books', 'other']
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Used - Good', 'Used - Fair', 'Damaged']
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  image: {
    type: String,
    required: true
  },
  returnDeadline: {
    type: Date
  },
  additionalNotes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LendingRequest', lendingRequestSchema); 