const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const adminMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true }, // admin's user id
  receiverId: { type: String, required: true }, // user's user id
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  seenByUser: { type: Boolean, default: false }, // for blue tick
  deliveredToReceiver: { type: Boolean, default: false } // for double tick
});

module.exports = mongoose.model('Message', MessageSchema);
module.exports = mongoose.model('AdminMessage', adminMessageSchema); 