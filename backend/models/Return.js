const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnLocation: { type: String, required: true },
  returnDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Return', returnSchema); 