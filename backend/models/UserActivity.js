const mongoose = require('mongoose');
const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  actionType: { type: String, enum: ['view', 'borrow'], required: true },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('UserActivity', userActivitySchema); 