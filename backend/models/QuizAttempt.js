const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  topicId: String,
  score: Number,
  total: Number,
  answers: [
    {
      question: String,
      selected: String,
      correct: String
    }
  ],
  attemptedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
