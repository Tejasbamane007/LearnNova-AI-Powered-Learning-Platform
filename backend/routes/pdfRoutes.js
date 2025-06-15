const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authenticateJWT = require('../middleware/authMiddleware');

// Generate notes from a PDF file
router.post('/generate-notes', authenticateJWT, pdfController.generateNotesFromPdf);

// Save notes to a course
router.post('/save-notes', authenticateJWT, pdfController.saveNotesToCourse);

// Get PDF notes for a course
router.get('/notes/:courseId', authenticateJWT, pdfController.getPdfNotes);

module.exports = router;