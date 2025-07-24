const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  seenByAdmin: { type: Boolean, default: false },
  deliveredToReceiver: { type: Boolean, default: false }, // for double tick
  seenByUser: { type: Boolean, default: false } // for blue tick (if needed)
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 