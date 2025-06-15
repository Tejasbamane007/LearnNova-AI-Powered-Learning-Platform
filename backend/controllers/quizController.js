const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const { generateQuizQuestions } = require('../services/aiService');
const { handleError } = require('../utils/errorHandler');

// Generate a quiz for a subject
exports.generateQuiz = async (req, res) => {
  try {
    const { topic, level, courseId } = req.body;
    const userId = req.user.userId;
    const subject = topic; // Using 'topic' param as the subject name for backward compatibility

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    // Normalize the level to match the enum values
    let normalizedLevel = 'intermediate';
    if (level) {
      const levelLower = level.toLowerCase();
      if (levelLower.includes('begin') || levelLower.includes('easy')) {
        normalizedLevel = 'beginner';
      } else if (levelLower.includes('inter') || levelLower.includes('medium')) {
        normalizedLevel = 'intermediate';
      } else if (levelLower.includes('adv') || levelLower.includes('hard')) {
        normalizedLevel = 'advanced';
      }
    }

    console.log(`Generating quiz for subject: ${subject}, normalized level: ${normalizedLevel}`);

    // Check if a quiz for this course already exists
    if (courseId) {
      const existingQuiz = await Quiz.findOne({ 
        userId, 
        courseId,
        completed: true // Only consider completed quizzes
      });

      if (existingQuiz) {
        return res.status(200).json({
          success: true,
          message: 'Quiz already exists for this course',
          quiz: {
            id: existingQuiz._id,
            topic: existingQuiz.topic,
            level: existingQuiz.level,
            questions: existingQuiz.questions,
            createdAt: existingQuiz.createdAt,
            completed: existingQuiz.completed,
            score: existingQuiz.score,
            results: existingQuiz.results
          }
        });
      }
    }

    // Generate 15 questions for the entire subject
    const rawQuestions = await generateQuizQuestions(subject, normalizedLevel, 15);
    
    // Process questions to ensure answers are valid
    const validatedQuestions = rawQuestions.map(q => {
      // Make sure the answer is one of the options
      if (!q.options.includes(q.answer)) {
        // If answer is not in options, set it to the first option
        q.answer = q.options[0];
      }
      return q;
    });
    
    // Create a new quiz
    const quiz = new Quiz({
      userId,
      user: userId, // Add both userId and user for compatibility
      courseId: courseId || null,
      course: courseId || null, // Add both courseId and course for compatibility
      topic: subject,
      level: normalizedLevel,
      questions: validatedQuestions,
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      quiz: {
        id: quiz._id,
        topic: quiz.topic,
        level: quiz.level,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      }
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    handleError(res, error);
  }
};

// Get all quizzes for the current user
exports.getMyQuizzes = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Query for quizzes with either userId or user field matching
    const quizzes = await Quiz.find({ 
      $or: [{ userId }, { user: userId }] 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      quizzes: quizzes.map(quiz => ({
        id: quiz._id,
        topic: quiz.topic,
        level: quiz.level,
        questionCount: quiz.questions.length,
        createdAt: quiz.createdAt,
      }))
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Get a specific quiz by ID
exports.getQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.userId;

    // Query for quiz with either userId or user field matching
    const quiz = await Quiz.findOne({ 
      _id: quizId, 
      $or: [{ userId }, { user: userId }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.status(200).json({
      success: true,
      quiz: {
        id: quiz._id,
        topic: quiz.topic,
        level: quiz.level,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Submit quiz answers and get results
exports.submitQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.userId;
    const { answers } = req.body;

    // Query for quiz with either userId or user field matching
    const quiz = await Quiz.findOne({ 
      _id: quizId, 
      $or: [{ userId }, { user: userId }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Calculate score
    let score = 0;
    const results = [];

    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index] || '';
      const isCorrect = userAnswer.toLowerCase() === question.answer.toLowerCase();
      
      if (isCorrect) {
        score++;
      }

      results.push({
        question: question.question,
        userAnswer,
        correctAnswer: question.answer,
        isCorrect,
      });
    });

    // Update quiz with results
    quiz.completed = true;
    quiz.score = score;
    quiz.results = results;
    await quiz.save();

    // If quiz is associated with a course, update course progress
    if (quiz.courseId) {
      const course = await Course.findById(quiz.courseId);
      if (course) {
        // Make sure the course belongs to the user
        if (course.user.toString() === userId || course.userId.toString() === userId) {
          // Initialize progress if it doesn't exist
          if (!course.progress) {
            course.progress = { 
              completedTopics: 0,
              totalTopics: course.topics ? course.topics.length : 0,
              testScores: [] 
            };
          }
          
          // Add test score to course progress
          course.progress.testScores = course.progress.testScores || [];
          
          // Calculate percentage score
          const percentageScore = (score / quiz.questions.length) * 100;
          
          // Add the score to test scores
          course.progress.testScores.push({
            topic: quiz.topic,
            score: percentageScore,
            date: new Date(),
          });
          
          // Update user's gamification stats
          const user = await User.findById(userId);
          if (user) {
            // Initialize gamification if it doesn't exist
            user.gamification = user.gamification || {
              xp: 0,
              streak: 0,
              badges: []
            };
            
            // Add XP based on quiz score
            const xpGained = Math.round(percentageScore / 10); // 1 XP for every 10% score
            user.gamification.xp += xpGained;
            
            // Add badges based on quiz performance
            if (percentageScore >= 80 && !user.gamification.badges.includes('Quiz Master')) {
              user.gamification.badges.push('Quiz Master');
            }
            
            if (percentageScore === 100 && !user.gamification.badges.includes('Perfect Score')) {
              user.gamification.badges.push('Perfect Score');
            }
            
            await user.save();
          }
          
          await course.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      score,
      total: quiz.questions.length,
      percentage: (score / quiz.questions.length) * 100,
      results,
    });
  } catch (error) {
    handleError(res, error);
  }
};