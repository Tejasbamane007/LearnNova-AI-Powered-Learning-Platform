const mongoose = require('mongoose');

// Sub-schemas
const noteSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

const progressSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  completedTopics: [
    {
      topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
      completedAt: { type: Date, default: Date.now },
    },
  ],
});

const gamificationSchema = new mongoose.Schema({
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  badges: [String],
});

// ✅ Main User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },

  googleId: {
    type: String,
    required: false,
  },

  progress: [progressSchema],

  gamification: gamificationSchema,

  lastProgressDate: Date,

  notes: [noteSchema],
});

module.exports = mongoose.model('User', userSchema);
