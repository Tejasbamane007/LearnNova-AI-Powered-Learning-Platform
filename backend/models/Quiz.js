// models/Quiz.js
const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'Not specified'],
    default: 'intermediate',
    trim: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(options) {
          return options.length >= 2; // Ensure we have at least 2 options
        },
        message: 'Quiz questions must have at least 2 options'
      }
    },
    answer: {
      type: String,
      required: true,
      validate: {
        validator: function(answer) {
          return this.options.includes(answer); // Ensure the answer is one of the options
        },
        message: 'The answer must be one of the provided options'
      }
    }
  }],
  completed: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  results: [{
    question: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  attempts: [{
    date: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      required: true
    },
    answers: {
      type: [String],
      required: true
    }
  }]
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;