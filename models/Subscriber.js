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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment'
  }],
  tags: [{
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
  syncedToBrevo: {
    type: Boolean,
    default: false
  },
  lastSyncedAt: {
    type: Date
  },
  metadata: {
    source: {
      type: String,
      enum: ['manual', 'import', 'api', 'webhook'],
      default: 'manual'
    },
    ipAddress: String,
    userAgent: String,
    referrer: String
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
subscriberSchema.index({ userId: 1, tags: 1 });
subscriberSchema.index({ 'statistics.lastOpenAt': -1 });
subscriberSchema.index({ createdAt: -1 });
subscriberSchema.index({ syncedToBrevo: 1 });

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
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to unsubscribe
subscriberSchema.methods.unsubscribe = async function() {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to resubscribe
subscriberSchema.methods.resubscribe = async function() {
  this.status = 'subscribed';
  this.unsubscribedAt = undefined;
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to add to list
subscriberSchema.methods.addToList = async function(listId) {
  if (!this.lists.includes(listId)) {
    this.lists.push(listId);
    this.updatedAt = new Date();
    await this.save();
  }
  return this;
};

// Method to remove from list
subscriberSchema.methods.removeFromList = async function(listId) {
  this.lists = this.lists.filter(id => id.toString() !== listId.toString());
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to add tags
subscriberSchema.methods.addTags = async function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  this.tags = [...new Set([...this.tags, ...newTags])];
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to remove tags
subscriberSchema.methods.removeTags = async function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to update attributes
subscriberSchema.methods.updateAttributes = async function(attributes) {
  this.attributes = { ...this.attributes, ...attributes };
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Method to mark as synced to Brevo
subscriberSchema.methods.markAsSynced = async function() {
  this.syncedToBrevo = true;
  this.lastSyncedAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// Static method to find by email
subscriberSchema.statics.findByEmail = function(userId, email) {
  return this.findOne({ userId, email: email.toLowerCase() });
};

// Static method to find by list
subscriberSchema.statics.findByList = function(userId, listId, status = 'subscribed') {
  return this.find({ userId, lists: listId, status });
};

// Static method to get statistics
subscriberSchema.statics.getStatistics = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        subscribed: { $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] } },
        unsubscribed: { $sum: { $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        complained: { $sum: { $cond: [{ $eq: ['$status', 'complained'] }, 1, 0] } },
        totalOpens: { $sum: '$statistics.openCount' },
        totalClicks: { $sum: '$statistics.clickCount' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    subscribed: 0,
    unsubscribed: 0,
    bounced: 0,
    complained: 0,
    totalOpens: 0,
    totalClicks: 0
  };
};

// Static method to get growth data
subscriberSchema.statics.getGrowthData = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const growthData = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newSubscribers: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  return growthData;
};

// Virtual for full name
subscriberSchema.virtual('fullName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Virtual for engagement score (opens + clicks)
subscriberSchema.virtual('engagementScore').get(function() {
  return (this.statistics.openCount || 0) + (this.statistics.clickCount || 0);
});

// Pre-save middleware
subscriberSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  this.updatedAt = new Date();
  next();
});

// Pre-remove middleware
subscriberSchema.pre('remove', async function(next) {
  // Remove subscriber from any campaign events
  await mongoose.model('CampaignEvent').updateMany(
    { email: this.email },
    { $unset: { subscriberId: 1 } }
  );
  next();
});

module.exports = mongoose.model('Subscriber', subscriberSchema);