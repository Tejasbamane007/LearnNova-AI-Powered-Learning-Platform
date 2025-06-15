// routes/chatbot.js
const express = require('express');
const authenticateJWT = require('../middleware/authMiddleware');
const Course = require('../models/Course');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', authenticateJWT, async (req, res) => {
  const { message } = req.body;

  try {
    const courses = await Course.find({ user: req.user.userId });
    const topics = courses.flatMap(course => course.topics).join(', ');

    const prompt = `
      You are a helpful AI tutor. The user is currently studying the following topics: ${topics}.
      Answer their question in a friendly and educational way.

      User question: ${message}
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });
  } catch (err) {
    console.error('❌ Chatbot error:', err);
    res.status(500).json({ message: 'Chatbot failed to respond', error: err.message });
  }
});

module.exports = router;
