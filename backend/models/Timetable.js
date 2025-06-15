const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  topics: [{
    title: {
      type: String,
      required: true
    },
    hours: {
      type: Number,
      required: true
    }
  }],
  entries: [{
    date: {
      type: String,
      required: true
    },
    sessions: [{
      topic: {
        type: String,
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      duration: {
        type: Number, // Duration in minutes
        required: true
      },
      isBreak: {
        type: Boolean,
        default: false
      },
      completed: {
        type: Boolean,
        default: false
      }
    }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('Timetable', TimetableSchema);