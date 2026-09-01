const mongoose = require('mongoose');

const WhatsAppContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phone: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: 'Unknown Contact',
  },
  assignedAgent: {
    type: String,
    default: '',
  },
  labels: {
    type: [String],
    default: [],
  },
  messageSequence: {
    type: String,
    default: '',
  },
  customField: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  botReplyOn: {
    type: Boolean,
    default: true,
  },
  email: {
    type: String,
    default: '',
  },
  lastMessageTimestamp: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

WhatsAppContactSchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppContact', WhatsAppContactSchema);
