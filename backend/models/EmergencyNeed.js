const mongoose = require('mongoose');

const EmergencyNeedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  expectedDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmergencyNeed', EmergencyNeedSchema);
