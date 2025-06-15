// routes/quiz.js
const express = require('express');
const authenticateJWT = require('../middleware/authMiddleware');
const quizController = require('../controllers/quizController');

const router = express.Router();

// Generate a quiz for a specific topic
router.post('/generate', authenticateJWT, quizController.generateQuiz);

// Get all quizzes for the current user
router.get('/', authenticateJWT, quizController.getMyQuizzes);

// Get a specific quiz by ID
router.get('/:id', authenticateJWT, quizController.getQuiz);

// Submit quiz answers and get score
router.post('/:id/submit', authenticateJWT, quizController.submitQuiz);

module.exports = router;