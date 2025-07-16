const mongoose = require('mongoose');

const apiLinkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  linkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  matchId: {
    type: String,
    required: [true, 'Match ID is required']
  },
  type: {
    type: String,
    enum: ['full', 'alive_status', 'points_table'],
    required: [true, 'Type is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: null
  },
  accessCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate random unique link ID
apiLinkSchema.statics.generateLinkId = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Method to get full API URL
apiLinkSchema.methods.getApiUrl = function() {
  return `/api/public/${this.linkId}`;
};

module.exports = mongoose.model('ApiLink', apiLinkSchema); 