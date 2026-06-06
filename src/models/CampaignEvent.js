// models/CampaignEvent.js
const mongoose = require('mongoose');

const campaignEventSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  type: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'],
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  subscriberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscriber'
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    device: String,
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
      region: String
    },
    linkUrl: String, // For click events
    rawEvent: mongoose.Schema.Types.Mixed // Store raw webhook data
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
campaignEventSchema.index({ campaignId: 1, timestamp: -1 });
campaignEventSchema.index({ campaignId: 1, type: 1 });
campaignEventSchema.index({ email: 1, type: 1 });
campaignEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Static method to get campaign timeline
campaignEventSchema.statics.getTimeline = async function(campaignId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const timeline = await this.aggregate([
    {
      $match: {
        campaignId: mongoose.Types.ObjectId(campaignId),
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.hour',
        events: {
          $push: {
            type: '$_id.type',
            count: '$count'
          }
        }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  return timeline;
};

module.exports = mongoose.model('CampaignEvent', campaignEventSchema);