// models/Subscriber.js
const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lists: [{
    type: String, // Brevo list IDs or custom list names
    trim: true
  }],
  status: {
    type: String,
    enum: ['subscribed', 'unsubscribed', 'bounced', 'complained'],
    default: 'subscribed'
  },
  statistics: {
    openCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    bounceCount: {
      type: Number,
      default: 0
    },
    complaintCount: {
      type: Number,
      default: 0
    },
    lastOpenAt: Date,
    lastClickAt: Date,
    lastEmailSentAt: Date
  },
  segments: [{
    type: String,
    trim: true
  }],
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'never'],
      default: 'weekly'
    }
  },
  lastActivity: {
    type: Date
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: Date,
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
subscriberSchema.index({ userId: 1, email: 1 });
subscriberSchema.index({ userId: 1, status: 1 });
subscriberSchema.index({ userId: 1, lists: 1 });
subscriberSchema.index({ userId: 1, segments: 1 });
subscriberSchema.index({ 'statistics.lastOpenAt': -1 });

// Method to update subscriber activity
subscriberSchema.methods.recordActivity = async function(type, metadata = {}) {
  const stats = this.statistics;
  
  switch(type) {
    case 'opened':
      stats.openCount++;
      stats.lastOpenAt = new Date();
      break;
    case 'clicked':
      stats.clickCount++;
      stats.lastClickAt = new Date();
      break;
    case 'bounced':
      stats.bounceCount++;
      break;
    case 'complained':
      stats.complaintCount++;
      break;
  }
  
  this.lastActivity = new Date();
  await this.save();
  return this;
};

module.exports = mongoose.model('Subscriber', subscriberSchema);