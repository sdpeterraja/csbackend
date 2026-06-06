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
    enum: [
      'sent', 
      'delivered', 
      'opened', 
      'clicked', 
      'bounced', 
      'complained', 
      'unsubscribed'
    ],
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
    linkUrl: String,
    rawEvent: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
campaignEventSchema.index({ campaignId: 1, timestamp: -1 });
campaignEventSchema.index({ campaignId: 1, type: 1 });
campaignEventSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model('CampaignEvent', campaignEventSchema);