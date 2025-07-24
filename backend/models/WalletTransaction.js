const mongoose = require('mongoose');
const walletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  relatedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('WalletTransaction', walletTransactionSchema); 