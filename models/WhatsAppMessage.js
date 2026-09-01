const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  contactName: {
    type: String
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'received', 'failed'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

whatsAppMessageSchema.index({ userId: 1, phone: 1, timestamp: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
