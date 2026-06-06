// models/Campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
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
  subject: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'draft'
  },
  type: {
    type: String,
    enum: ['regular', 'automated', 'ab_test', 'rss'],
    default: 'regular'
  },
  
  // Content
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  content: {
    type: String
  },
  
  // Targeting
  audienceList: {
    type: String
  },
  segments: {
    type: mongoose.Schema.Types.Mixed, // JSON object for segment conditions
    default: null
  },
  targetEmails: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Scheduling
  scheduledFor: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  
  // Statistics
  statistics: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    sentCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
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
    uniqueOpens: {
      type: Number,
      default: 0
    },
    uniqueClicks: {
      type: Number,
      default: 0
    },
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
    }
  },
  
  // A/B Test specific
  abTest: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    variants: [{
      name: String,
      subject: String,
      content: String,
      sentCount: Number,
      openCount: Number,
      clickCount: Number,
      winner: Boolean
    }],
    winnerCriteria: {
      type: String,
      enum: ['open_rate', 'click_rate'],
      default: 'open_rate'
    },
    testPercentage: {
      type: Number,
      default: 20 // Percentage of recipients for A/B test
    }
  },
  
  // Brevo specific
  brevoCampaignId: {
    type: Number
  },
  brevoMessageId: {
    type: String
  },
  
  // Settings
  settings: {
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    trackUnsubscribes: {
      type: Boolean,
      default: true
    },
    addUnsubscribeLink: {
      type: Boolean,
      default: true
    },
    updateExistingContacts: {
      type: Boolean,
      default: true
    }
  },
  
  // Automation specific
  automation: {
    trigger: {
      type: String,
      enum: ['welcome', 'abandoned_cart', 'birthday', 'anniversary', 'order_completed', null],
      default: null
    },
    delay: {
      type: Number, // Delay in minutes
      default: 0
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed
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
campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, 'automation.trigger': 1 });
campaignSchema.index({ scheduledFor: 1 }, { sparse: true });
campaignSchema.index({ brevoCampaignId: 1 });
campaignSchema.index({ brevoMessageId: 1 });

// Virtual for campaign performance
campaignSchema.virtual('performance').get(function() {
  return {
    openRate: this.statistics.openRate,
    clickRate: this.statistics.clickRate,
    bounceRate: this.statistics.bounceRate,
    totalEngagement: this.statistics.uniqueOpens + this.statistics.uniqueClicks
  };
});

// Method to update statistics
campaignSchema.methods.updateStatistics = async function(eventType) {
  const stats = this.statistics;
  
  switch(eventType) {
    case 'sent':
      stats.sentCount++;
      break;
    case 'delivered':
      stats.deliveredCount++;
      break;
    case 'opened':
      stats.openCount++;
      stats.uniqueOpens++;
      break;
    case 'clicked':
      stats.clickCount++;
      stats.uniqueClicks++;
      break;
    case 'bounced':
      stats.bounceCount++;
      break;
    case 'complained':
      stats.complaintCount++;
      break;
  }
  
  // Recalculate rates
  if (stats.deliveredCount > 0) {
    stats.openRate = (stats.uniqueOpens / stats.deliveredCount) * 100;
    stats.clickRate = (stats.uniqueClicks / stats.deliveredCount) * 100;
    stats.bounceRate = (stats.bounceCount / stats.sentCount) * 100;
    
    // Round to 2 decimal places
    stats.openRate = Math.round(stats.openRate * 100) / 100;
    stats.clickRate = Math.round(stats.clickRate * 100) / 100;
    stats.bounceRate = Math.round(stats.bounceRate * 100) / 100;
  }
  
  await this.save();
  return this;
};

module.exports = mongoose.model('Campaign', campaignSchema);