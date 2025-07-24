const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  returnDate: { type: Date, required: true },
  deadlineDate: { type: Date, required: true },
  penaltyAmount: { type: Number, default: 0 },
  penaltyPercent: { type: Number, default: 0 },
  strikeCount: { type: Number, default: 0 },
  banUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Penalty', penaltySchema); 