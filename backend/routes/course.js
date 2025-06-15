const express = require('express');
const mongoose = require('mongoose');
const authenticateJWT = require('../middleware/authMiddleware');
const Course = require('../models/Course');
const { generateNotes, generateQuiz, generateTimetable } = require('../ai/generator');
const User = require('../models/User');
const moment = require('moment'); 

const router = express.Router();

// ✅ Generate and save a new course for the authenticated user
router.post('/generate', authenticateJWT, async (req, res) => {
  try {
    console.log('🔍 /generate endpoint called');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 User from token:', req.user);
    
    // Accept both 'difficulty' and 'level' parameters for flexibility
    const { subject, difficulty, level } = req.body;
    const difficultyLevel = difficulty || level; // Use whichever is provided
    
    if (!subject || !difficultyLevel) {
      console.error('❌ Missing required parameters');
      return res.status(400).json({ error: 'Subject and difficulty/level are required' });
    }
    
    const userId = req.user.userId;
    console.log(`✅ Generating notes for subject: ${subject}, level: ${difficultyLevel}, userId: ${userId}`);

    // Check if course already exists
    const existingCourse = await Course.findOne({ 
      user: userId, 
      subject, 
      difficulty: difficultyLevel 
    });

    if (existingCourse) {
      console.log('Course already exists, returning existing course');
      return res.status(200).json({ course: existingCourse, message: 'Course already exists' });
    }

    console.log('Generating new course content...');
    let courseData;
    try {
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Generation timed out after 30 seconds')), 30000);
      });
      
      // Race between the generation and the timeout
      courseData = await Promise.race([
        generateNotes(subject, difficultyLevel),
        timeoutPromise
      ]);
      
      console.log('Course data generated successfully');
      
      // Validate the generated data
      if (!courseData || !courseData.topics || !Array.isArray(courseData.topics) || courseData.topics.length === 0) {
        console.error('Invalid course data format:', courseData);
        throw new Error('Generated course data is invalid or empty');
      }
    } catch (error) {
      console.error('Error generating course data:', error);
      
      // Instead of returning an error, create fallback content
      console.log('Creating fallback content for the course');
      courseData = {
        topics: [
          {
            title: "Introduction to " + subject,
            notes: `${subject.charAt(0).toUpperCase() + subject.slice(1)} is an important field of study with many practical applications. This introductory topic covers the fundamental concepts and principles that form the foundation of ${subject}.`,
            content: `${subject.charAt(0).toUpperCase() + subject.slice(1)} is an important field of study with many practical applications. This introductory topic covers the fundamental concepts and principles that form the foundation of ${subject}.`
          },
          {
            title: "Key Principles of " + subject,
            notes: `Understanding the key principles of ${subject} is essential for mastering this field. These principles provide a framework for analyzing and solving problems related to ${subject}.`,
            content: `Understanding the key principles of ${subject} is essential for mastering this field. These principles provide a framework for analyzing and solving problems related to ${subject}.`
          },
          {
            title: "Applications of " + subject,
            notes: `${subject} has numerous practical applications in various fields. This topic explores how the concepts and principles of ${subject} are applied in real-world scenarios.`,
            content: `${subject} has numerous practical applications in various fields. This topic explores how the concepts and principles of ${subject} are applied in real-world scenarios.`
          }
        ]
      };
    }
    
    // Ensure topics have the correct format
    if (!courseData || !courseData.topics || !Array.isArray(courseData.topics)) {
      console.error('Invalid course data format:', courseData);
      // Create fallback content
      courseData = {
        topics: [
          {
            title: "Introduction to " + subject,
            notes: "We encountered an issue generating content. Please try again later.",
            content: "We encountered an issue generating content. Please try again later."
          }
        ]
      };
    }
    
    // Ensure each topic has title and notes
    const formattedTopics = courseData.topics.map(topic => {
      // Get content from either field
      let notesContent = topic.notes || topic.content || '';
      
      // Clean up the content
      notesContent = notesContent
        .replace(/```[^`]*```/g, "") // Remove code blocks
        .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
        .trim();
      
      // If still empty after cleanup, provide default message
      if (!notesContent) {
        notesContent = 'Content for this topic is being prepared.';
      }
      
      // Make sure we have both title and notes
      return {
        title: topic.title || 'Untitled Topic',
        content: notesContent,
        notes: notesContent
      };
    });
    
    console.log('Formatted topics:', JSON.stringify(formattedTopics, null, 2));

    // Create the new course without startDate and deadlineDate
    const newCourse = new Course({
      subject,
      difficulty: difficultyLevel,
      topics: formattedTopics,
      user: userId,
      userId: userId  // Add userId field to match the required field in the model
      // No startDate and deadlineDate here
    });

    await newCourse.save();
    console.log('New course saved successfully');

    res.status(201).json({ course: newCourse });
  } catch (error) {
    console.error('Error generating course:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ✅ Get all courses for the logged-in user with pagination and sorting
router.get('/my-courses', authenticateJWT, async (req, res) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  try {
    const userId = req.user.userId;
    
    // Get all courses for the user
    const courses = await Course.find({ user: userId })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalCourses = await Course.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalCourses / limit);

    // Get quiz information for each course
    const Quiz = require('../models/Quiz');
    let Timetable;
    try {
      Timetable = require('../models/Timetable');
    } catch (error) {
      console.log('Timetable model not found, skipping timetable check');
    }
    
    // Enhanced courses with additional information
    const enhancedCourses = await Promise.all(courses.map(async (course) => {
      const courseObj = course.toObject();
      
      // Check if a quiz exists for this course
      const quiz = await Quiz.findOne({ 
        $or: [
          { userId: userId, courseId: course._id },
          { user: userId, courseId: course._id },
          { userId: userId, course: course._id },
          { user: userId, course: course._id }
        ]
      });
      
      console.log(`Course ${course.subject}: Quiz exists: ${!!quiz}`);
      
      // Check if a timetable exists for this course
      let timetable = null;
      if (Timetable) {
        timetable = await Timetable.findOne({ 
          userId: userId, 
          courseId: course._id 
        });
      }
      
      return {
        ...courseObj,
        hasQuiz: !!quiz,
        hasTimetable: !!timetable,
        hasPdfNotes: false // Default to false since we don't have the model
      };
    }));

    res.status(200).json({
      courses: enhancedCourses,
      totalCourses,
      totalPages,
      currentPage: Number(page),
      perPage: Number(limit),
    });
  } catch (err) {
    console.error('❌ Fetch courses error:', err);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// ✅ Regenerate topics for a course
router.post('/:id/regenerate', authenticateJWT, async (req, res) => {
  const { subject, difficulty } = req.body;

  try {
    const { topics } = await generateCourseContent(subject, difficulty);

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { topics },
      { new: true }
    );

    res.json({ message: 'Course regenerated', course });
  } catch (err) {
    console.error('❌ Regenerate error:', err);
    res.status(500).json({ message: 'Failed to regenerate course' });
  }
});

// ✅ Track topic progress
router.post('/topic/:topicId/progress/:courseId', authenticateJWT, async (req, res) => {
  console.log("🔍 userId from token:", req.user.userId);
  console.log("🔍 Topic ID:", req.params.topicId);
  console.log("🔍 Course ID:", req.params.courseId);
  
  try {
    const userId = req.user.userId;
    const { topicId, courseId } = req.params;
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid user ID:", userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.error("❌ Invalid course ID:", courseId);
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      console.error("❌ Invalid topic ID:", topicId);
      return res.status(400).json({ message: 'Invalid topic ID' });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ User not found:", userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Initialize progress array if it doesn't exist
    if (!user.progress) {
      user.progress = [];
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      console.error("❌ Course not found:", courseId);
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Verify the topic exists in the course
    const topicExists = course.topics && course.topics.some(topic => 
      topic._id.toString() === topicId
    );
    
    if (!topicExists) {
      console.error("❌ Topic not found in course:", topicId);
      return res.status(404).json({ message: 'Topic not found in course' });
    }
    
    // 🧠 Check if progress for this course exists
    let courseProgress = user.progress.find(p => 
      p.courseId && p.courseId.toString() === courseId
    );

    if (!courseProgress) {
      courseProgress = {
        courseId,
        completedTopics: [{ topicId }]
      };
      user.progress.push(courseProgress);
    } else {
      // Ensure completedTopics is an array
      if (!Array.isArray(courseProgress.completedTopics)) {
        courseProgress.completedTopics = [];
      }
      
      const alreadyCompleted = courseProgress.completedTopics.find(
        t => t.topicId && t.topicId.toString() === topicId
      );

      if (!alreadyCompleted) {
        courseProgress.completedTopics.push({ topicId });
      }
    }

    // Initialize course progress if it doesn't exist
    if (!course.progress) {
      course.progress = {
        completedTopics: 0,
        totalTopics: course.topics ? course.topics.length : 0,
        testScores: []
      };
    }
    
    // Count completed topics
    const completedTopicsCount = courseProgress.completedTopics.length;
    const totalTopicsCount = course.topics ? course.topics.length : 0;
    
    // Update the progress
    course.progress.completedTopics = completedTopicsCount;
    course.progress.totalTopics = totalTopicsCount;
    
    // Save the course
    await course.save();
    console.log(`✅ Updated course progress: ${completedTopicsCount}/${totalTopicsCount} topics completed`);

    // 🎮 GAMIFICATION LOGIC
    if (!user.gamification) {
      user.gamification = {
        xp: 0,
        streak: 0,
        badges: []
      };
    }

    // 🪙 Add XP
    user.gamification.xp += 10; // Add 10 XP per completed topic

    // 🔥 Streak logic (basic version)
    try {
      const now = moment();
      const lastProgressDate = user.lastProgressDate ? moment(user.lastProgressDate) : null;

      if (!lastProgressDate || now.diff(lastProgressDate, 'days') >= 1) {
        if (lastProgressDate && now.diff(lastProgressDate, 'days') === 1) {
          // If yesterday's progress, increase streak by 1
          user.gamification.streak += 1;
        } else {
          // If more than 1 day gap, reset streak
          user.gamification.streak = 1;
        }
      }

      user.lastProgressDate = now.toDate(); // Store as Date object
    } catch (momentError) {
      console.error("❌ Error in moment.js date handling:", momentError);
      // Don't fail the whole operation if date handling fails
    }

    // 🏅 Badges logic
    if (!Array.isArray(user.gamification.badges)) {
      user.gamification.badges = [];
    }
    
    if (!user.gamification.badges.includes("First Topic") && user.gamification.xp >= 10) {
      user.gamification.badges.push("First Topic");
    }

    if (!user.gamification.badges.includes("3-Day Streak") && user.gamification.streak >= 3) {
      user.gamification.badges.push("3-Day Streak");
    }

    if (user.gamification.xp >= 100 && !user.gamification.badges.includes('Rookie Learner')) {
      user.gamification.badges.push('Rookie Learner');
    }

    await user.save();

    res.json({ 
      message: 'Progress updated with gamification ✅',
      progress: {
        completedTopics: completedTopicsCount,
        totalTopics: totalTopicsCount,
        percentage: totalTopicsCount > 0 ? (completedTopicsCount / totalTopicsCount) * 100 : 0
      }
    });
  } catch (err) {
    console.error('❌ Error updating progress:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ message: 'Something went wrong', error: err.message });
  }
});

// Get progress for a specific course
router.get('/progress/:courseId', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    // Make sure progress is initialized
    if (!user.progress) {
      return res.json({
        courseId: req.params.courseId,
        completedTopics: [],
      });
    }

    const progress = user.progress.find(
      p => p.courseId.toString() === req.params.courseId
    );

    res.json({
      courseId: req.params.courseId,
      completedTopics: progress ? progress.completedTopics : [],
    });
  } catch (err) {
    console.error('❌ Error fetching progress:', err);
    res.status(500).json({ message: 'Failed to get progress' });
  }
});

// Reset progress for a specific course
router.post('/progress/reset/:courseId', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    // If no progress, nothing to reset
    if (!user.progress) {
      return res.status(400).json({ message: 'No progress to reset' });
    }

    // Remove progress for the course
    user.progress = user.progress.filter(
      p => p.courseId.toString() !== req.params.courseId
    );

    await user.save();
    res.json({ message: 'Progress reset successfully' });
  } catch (err) {
    console.error('❌ Error resetting progress:', err);
    res.status(500).json({ message: 'Failed to reset progress' });
  }
});

// Delete a course
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const courseId = req.params.id;

    // Find and delete the course
    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Remove the course from the user's progress
    const user = await User.findById(req.user.userId);
    if (user) {
      user.progress = user.progress.filter(
        (progress) => progress.courseId.toString() !== courseId
      );
      await user.save();
    }

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting course:', err);
    res.status(500).json({ message: 'Failed to delete course' });
  }
});


// Get course progress for the logged-in user
router.get('/progress', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.progress || user.progress.length === 0) {
      // No progress data, but check if the user has courses
      const courses = await Course.find({ user: req.user.userId });
      if (courses.length === 0) {
        return res.status(404).json({ message: 'No courses found for this user' });
      }

      // If the user has courses but no progress, indicate it
      return res.status(200).json({
        message: 'Courses found but no progress made yet.',
        progress: []
      });
    }

    // If progress exists, return the user's progress
    res.status(200).json({ progress: user.progress });
  } catch (err) {
    console.error('❌ Error fetching progress:', err);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
});

// Save or update a note for a topic
router.post('/topic/:topicId/note', authenticateJWT, async (req, res) => {
  const { topicId } = req.params;
  const { content } = req.body;

  try {
    const user = await User.findById(req.user.userId);

    if (!user.notes) user.notes = [];

    // Check if note already exists
    const existingNote = user.notes.find(n => n.topicId.toString() === topicId);

    if (existingNote) {
      existingNote.content = content;
    } else {
      user.notes.push({ topicId, content });
    }

    await user.save();

    res.json({ message: 'Note saved successfully' });
  } catch (err) {
    console.error('❌ Error saving note:', err);
    res.status(500).json({ message: 'Failed to save note' });
  }
});

// Get a note for a topic
router.get('/topic/:topicId/note', authenticateJWT, async (req, res) => {
  const { topicId } = req.params;

  try {
    const user = await User.findById(req.user.userId);

    const note = user.notes.find(n => n.topicId.toString() === topicId);

    if (!note) return res.status(404).json({ message: 'Note not found' });

    res.json({ content: note.content });
  } catch (err) {
    console.error('❌ Error fetching note:', err);
    res.status(500).json({ message: 'Failed to fetch note' });
  }
});

// Save or update notes for a topic
router.post('/notes/:courseId/:topicId', authenticateJWT, async (req, res) => {
  const { courseId, topicId } = req.params;
  const { content } = req.body;

  try {
    const user = await User.findById(req.user.userId);

    // Check if a note already exists
    const existingNote = user.notes.find(
      note => note.topicId.toString() === topicId
    );

    if (existingNote) {
      // Update note content
      existingNote.content = content;
      existingNote.updatedAt = new Date();
    } else {
      // Add new note
      user.notes.push({ topicId, content });
    }

    await user.save();
    res.status(200).json({ message: 'Note saved successfully' });
  } catch (err) {
    console.error('❌ Error saving note:', err);
    res.status(500).json({ message: 'Failed to save note' });
  }
});

// Get note for a topic
router.get('/notes/:topicId', authenticateJWT, async (req, res) => {
  const { topicId } = req.params;

  try {
    const user = await User.findById(req.user.userId);

    const note = user.notes.find(
      note => note.topicId.toString() === topicId
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({ note });
  } catch (err) {
    console.error('❌ Error fetching note:', err);
    res.status(500).json({ message: 'Failed to fetch note' });
  }
});

router.post('/gamification/update', authenticateJWT, async (req, res) => {
  const { xpEarned } = req.body;

  try {
    const user = await User.findById(req.user.userId);

    // Update XP
    user.gamification.xp += xpEarned || 10; // Default: +10 XP

    // Streak: if last progress was yesterday, +1 streak. If today, keep it. If older, reset.
    const now = new Date();
    const lastDate = user.lastProgressDate || new Date(0);
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.gamification.streak += 1;
    } else if (diffDays > 1) {
      user.gamification.streak = 1;
    }

    user.lastProgressDate = now;

    // Example: Give badge at 100 XP
    if (user.gamification.xp >= 100 && !user.gamification.badges.includes('Rookie Learner')) {
      user.gamification.badges.push('Rookie Learner');
    }

    await user.save();
    res.json({ message: 'Gamification updated', gamification: user.gamification });
  } catch (err) {
    console.error('❌ Error updating gamification:', err);
    res.status(500).json({ message: 'Failed to update gamification' });
  }
});

router.get('/gamification', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ gamification: user.gamification });
  } catch (err) {
    console.error('❌ Error fetching gamification:', err);
    res.status(500).json({ message: 'Failed to fetch gamification' });
  }
});

// ✅ Generate timetable for a course based on start and deadline date
router.post('/:id/generate-timetable', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { startDate, deadlineDate } = req.body;

  try {
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if the provided dates are valid
    if (!startDate || !deadlineDate) {
      return res.status(400).json({ message: 'Start date and deadline date are required' });
    }

    // Convert to moment objects for easier manipulation
    const start = moment(startDate);
    const deadline = moment(deadlineDate);

    // Ensure the start date is before the deadline
    if (start.isAfter(deadline)) {
      return res.status(400).json({ message: 'Start date cannot be after the deadline date' });
    }

    // Gather the topic titles (this is the array we’ll send to the AI)
    const topics = course.topics.map(topic => topic.title);

    // Use AI to generate the timetable
    const timetable = await generateTimetable(topics, startDate, deadlineDate); // Call AI function

    // Save the generated timetable to the course
    course.timetable = timetable;
    await course.save();

    res.status(200).json({ message: 'Timetable generated successfully', timetable });
  } catch (err) {
    console.error('❌ Error generating timetable:', err);
    res.status(500).json({ message: 'Failed to generate timetable', error: err.message });
  }
});

router.get('/:courseId/quiz/:topicIndex', async (req, res) => {
  try {
    const { courseId, topicIndex } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const topic = course.topics[topicIndex];
    if (!topic || !topic.quiz) return res.status(404).json({ error: "Quiz not found" });

    res.status(200).json({ quiz: topic.quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching quiz" });
  }
});


router.post('/:courseId/quiz/:topicIndex', async (req, res) => {
  try {
    const { courseId, topicIndex } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const topic = course.topics[topicIndex];
    if (!topic || !topic.notes) {
      return res.status(400).json({ error: "Notes must be generated before creating a quiz." });
    }

    // Call your AI quiz generation logic with notes
    const generatedQuiz = await generateQuiz(topic.notes);

    // Validate quiz format (expects array of { question, options, answer })
    if (!Array.isArray(generatedQuiz)) {
      return res.status(500).json({ error: "Invalid quiz format generated" });
    }

    // Save to DB
    topic.quiz = generatedQuiz;
    await course.save();

    res.status(200).json({ quiz: generatedQuiz });
  } catch (error) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// POST /api/courses/:courseId/update-progress
router.post('/:courseId/update-progress', authenticateJWT, async (req, res) => {
  const { courseId } = req.params;
  const { topicTitle } = req.body;
  const userId = req.user.id;

  if (!topicTitle) {
    return res.status(400).json({ message: "Topic title is required." });
  }

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const topic = course.topics.find(t => t.title === topicTitle);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found in this course." });
    }

    if (topic.completed) {
      return res.status(400).json({ message: "Topic already marked as completed." });
    }

    // Mark the topic as completed
    topic.completed = true;

    // Update completedTopics count
    course.completedTopics = course.topics.filter(t => t.completed).length;

    // ✅ XP, Streaks, Badges (simple logic)
    if (!course.xp) course.xp = 0;
    if (!course.streak) course.streak = 0;
    if (!course.badges) course.badges = [];

    course.xp += 10; // Earn 10 XP per topic
    course.streak += 1;

    // Award badges
    if (course.streak === 5 && !course.badges.includes("5-Day Streak")) {
      course.badges.push("5-Day Streak");
    }
    if (course.completedTopics === course.topics.length && !course.badges.includes("Course Completed")) {
      course.badges.push("Course Completed");
    }

    await course.save();

    res.status(200).json({
      message: "Progress updated successfully.",
      xp: course.xp,
      streak: course.streak,
      completedTopics: course.completedTopics,
      badges: course.badges
    });
  } catch (err) {
    console.error("❌ Error updating progress:", err);
    res.status(500).json({ message: "Failed to update progress", error: err.message });
  }
});

// ✅ Update course flags (hasTimetable, hasQuiz, hasPdfNotes)
router.patch('/:courseId/update-flags', authenticateJWT, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { hasTimetable, hasQuiz, hasPdfNotes } = req.body;
    const userId = req.user.userId;

    console.log(`Updating flags for course ${courseId}:`, req.body);

    // Find the course
    const course = await Course.findOne({
      _id: courseId,
      $or: [
        { user: userId },
        { userId: userId }
      ]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Update the flags if they are provided
    if (hasTimetable !== undefined) {
      course.hasTimetable = hasTimetable;
    }
    if (hasQuiz !== undefined) {
      course.hasQuiz = hasQuiz;
    }
    if (hasPdfNotes !== undefined) {
      course.hasPdfNotes = hasPdfNotes;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course flags updated successfully',
      course: {
        _id: course._id,
        hasTimetable: course.hasTimetable,
        hasQuiz: course.hasQuiz,
        hasPdfNotes: course.hasPdfNotes
      }
    });
  } catch (error) {
    console.error('Error updating course flags:', error);
    res.status(500).json({ message: 'Failed to update course flags', error: error.message });
  }
});

// ✅ Update overall course progress
router.post('/progress/update/:courseId', authenticateJWT, async (req, res) => {
  const { progressPercentage } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    const { courseId } = req.params;

    if (!user.progress) user.progress = [];

    // Check if course progress already exists
    let courseProgress = user.progress.find(p => p.courseId.toString() === courseId);

    if (!courseProgress) {
      courseProgress = {
        courseId,
        completedTopics: [],
        progressPercentage: progressPercentage || 0
      };
      user.progress.push(courseProgress);
    } else {
      courseProgress.progressPercentage = progressPercentage;
    }

    await user.save();
    res.status(200).json({ message: 'Course progress updated successfully', progress: courseProgress });
  } catch (err) {
    console.error('❌ Error updating course progress:', err);
    res.status(500).json({ message: 'Failed to update course progress' });
  }
});



module.exports = router;
