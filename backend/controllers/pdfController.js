const Course = require('../models/Course');
const { generateNotesFromPdf } = require('../services/aiService');
const { handleError } = require('../utils/errorHandler');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
}).single('pdf');

// Generate notes from a PDF file
exports.generateNotesFromPdf = (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { courseId } = req.body;
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      if (!courseId) {
        return res.status(400).json({ success: false, message: 'Course ID is required' });
      }

      // Check if course exists and belongs to the user
      const course = await Course.findOne({ _id: courseId, user: userId });
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      // Read the PDF file
      const pdfPath = req.file.path;
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Extract text from PDF (in a real implementation, you would use a PDF parsing library)
      // For now, we'll use a more substantial sample text to improve generation
      const pdfContent = `Sample PDF content for ${course.subject} at ${course.difficulty} level.
      
This document covers the following topics:
1. Introduction to ${course.subject}
2. Key concepts and principles
3. Advanced techniques and methodologies
4. Practical applications and case studies
5. Future trends and developments

Each section provides detailed explanations, examples, and references to help students understand the material thoroughly.`;

      // Generate notes from PDF content
      const notes = await generateNotesFromPdf(pdfContent, course.subject, course.difficulty);
      
      // Only save notes to the course if explicitly requested
      const { autoSave } = req.body;
      
      if (autoSave === 'true') {
        // Save notes to the course
        if (!course.pdfNotes) {
          course.pdfNotes = [];
        }
  
        course.pdfNotes.push({
          fileName: req.file.originalname,
          notes,
          createdAt: new Date()
        });
  
        await course.save();
      }

      // Clean up the uploaded file
      fs.unlinkSync(pdfPath);

      res.status(200).json({
        success: true,
        notes,
        message: 'Notes generated successfully'
      });
    } catch (error) {
      // Clean up the uploaded file if it exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      handleError(res, error);
    }
  });
};

// Save notes to a course
exports.saveNotesToCourse = async (req, res) => {
  try {
    const { courseId, notes, fileName } = req.body;
    const userId = req.user.userId;

    if (!courseId || !notes) {
      return res.status(400).json({ success: false, message: 'Course ID and notes are required' });
    }

    // Check if course exists and belongs to the user
    const course = await Course.findOne({ _id: courseId, user: userId });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Initialize pdfNotes array if it doesn't exist
    if (!course.pdfNotes) {
      course.pdfNotes = [];
    }

    // Add the notes to the course
    course.pdfNotes.push({
      fileName: fileName || 'Generated Notes',
      notes,
      createdAt: new Date()
    });

    await course.save();

    res.status(200).json({
      success: true,
      message: 'Notes saved successfully',
      noteId: course.pdfNotes[course.pdfNotes.length - 1]._id
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Get PDF notes for a course
exports.getPdfNotes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    // Check if course exists and belongs to the user
    const course = await Course.findOne({ _id: courseId, user: userId });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Return the PDF notes
    res.status(200).json({
      success: true,
      pdfNotes: course.pdfNotes || []
    });
  } catch (error) {
    handleError(res, error);
  }
};