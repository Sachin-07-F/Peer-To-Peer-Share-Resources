const mongoose = require('mongoose');
const searchActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  searchTerm: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('SearchActivity', searchActivitySchema); 