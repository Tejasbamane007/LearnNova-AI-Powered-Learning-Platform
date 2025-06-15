const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const authenticateJWT = require('../middleware/authMiddleware');

// Generate a timetable for a course
router.post('/:courseId', authenticateJWT, timetableController.generateTimetable);

// Get timetable for a course
router.get('/:courseId', authenticateJWT, timetableController.getCourseTimetable);

// Mark a study session as completed
router.patch('/:courseId/:dateIndex/:sessionIndex', authenticateJWT, timetableController.markSessionCompleted);

module.exports = router;