const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quality: String,
  image: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  category: String,
  tags: [{ type: String }],
  popularityScore: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'borrowed'], default: 'available' },
  returnDeadline: { type: Date },
});

module.exports = mongoose.model('Product', productSchema);