// models/Segment.js
const mongoose = require('mongoose');

const segmentSchema = new mongoose.Schema({
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
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  subscriberCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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
segmentSchema.index({ userId: 1, name: 1 });
segmentSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Segment', segmentSchema);