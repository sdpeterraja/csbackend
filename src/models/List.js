// models/List.js
const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  brevoListId: {
    type: Number // Sync with Brevo list ID
  },
  subscriberCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  settings: {
    allowDuplicate: {
      type: Boolean,
      default: false
    },
    requireDoubleOptIn: {
      type: Boolean,
      default: true
    },
    welcomeEmailTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
listSchema.index({ userId: 1, name: 1 });
listSchema.index({ userId: 1, brevoListId: 1 });

module.exports = mongoose.model('List', listSchema);