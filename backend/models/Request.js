const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  contactNumber: String,
  contactEmail: String,
  deliveryLocation: String,
  deliveryDate: Date,
  boughtFromWallet: { type: Boolean, default: false }
});

module.exports = mongoose.model('Request', requestSchema);