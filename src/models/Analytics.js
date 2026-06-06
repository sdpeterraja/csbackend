// models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  metrics: {
    campaignsSent: {
      type: Number,
      default: 0
    },
    emailsSent: {
      type: Number,
      default: 0
    },
    emailsDelivered: {
      type: Number,
      default: 0
    },
    uniqueOpens: {
      type: Number,
      default: 0
    },
    uniqueClicks: {
      type: Number,
      default: 0
    },
    bounces: {
      type: Number,
      default: 0
    },
    complaints: {
      type: Number,
      default: 0
    },
    unsubscribes: {
      type: Number,
      default: 0
    },
    newSubscribers: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  rates: {
    openRate: {
      type: Number,
      default: 0
    },
    clickRate: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    unsubscribeRate: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for date range queries
analyticsSchema.index({ userId: 1, date: -1 });

// Static method to aggregate daily analytics
analyticsSchema.statics.aggregateDaily = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const campaigns = await mongoose.model('Campaign').find({
    userId,
    sentAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const events = await mongoose.model('CampaignEvent').find({
    campaignId: { $in: campaigns.map(c => c._id) },
    timestamp: { $gte: startOfDay, $lte: endOfDay }
  });
  
  // Aggregate metrics from events
  const metrics = {
    campaignsSent: campaigns.length,
    emailsSent: campaigns.reduce((sum, c) => sum + (c.statistics?.sentCount || 0), 0),
    emailsDelivered: events.filter(e => e.type === 'delivered').length,
    uniqueOpens: [...new Set(events.filter(e => e.type === 'opened').map(e => e.email))].length,
    uniqueClicks: [...new Set(events.filter(e => e.type === 'clicked').map(e => e.email))].length,
    bounces: events.filter(e => e.type === 'bounced').length,
    complaints: events.filter(e => e.type === 'complained').length,
    unsubscribes: events.filter(e => e.type === 'unsubscribed').length
  };
  
  // Calculate rates
  const rates = {
    openRate: metrics.emailsDelivered > 0 ? (metrics.uniqueOpens / metrics.emailsDelivered) * 100 : 0,
    clickRate: metrics.emailsDelivered > 0 ? (metrics.uniqueClicks / metrics.emailsDelivered) * 100 : 0,
    bounceRate: metrics.emailsSent > 0 ? (metrics.bounces / metrics.emailsSent) * 100 : 0,
    unsubscribeRate: metrics.emailsDelivered > 0 ? (metrics.unsubscribes / metrics.emailsDelivered) * 100 : 0
  };
  
  return { metrics, rates };
};

module.exports = mongoose.model('Analytics', analyticsSchema);