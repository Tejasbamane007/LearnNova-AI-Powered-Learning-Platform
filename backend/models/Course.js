const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: String
});

const topicSchema = new mongoose.Schema({
  title: String,
  content: String,
  notes: String, // Add notes field for compatibility
  quiz: [quizSchema],
  estimatedHours: { type: Number, default: 2 }, // Add estimatedHours field with default of 2
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' }
});

const timetableSchema = new mongoose.Schema({
  date: String,       
  topic: String       
});

const pdfNoteSchema = new mongoose.Schema({
  fileName: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For backward compatibility
  subject: { type: String },
  difficulty: { type: String, required: true },

  startDate: { type: Date, required: false },     // Changed to optional
  deadlineDate: { type: Date, required: false },  // Changed to optional

  topics: [topicSchema],       
  timetable: [timetableSchema], 
  pdfNotes: [pdfNoteSchema],

  progress: {
    completedTopics: { type: Number, default: 0 },
    totalTopics: { type: Number, default: 0 },
    testScores: [{
      topic: String,
      score: Number,
      date: Date
    }]
  },

  studyStreak: {
    daysInARow: { type: Number, default: 0 },
    lastStudied: { type: Date }
  },

  // Feature flags
  hasTimetable: { type: Boolean, default: false },
  hasQuiz: { type: Boolean, default: false },
  hasPdfNotes: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
