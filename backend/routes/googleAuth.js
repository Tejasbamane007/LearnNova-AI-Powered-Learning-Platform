const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Google authentication route
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    try {
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Redirect to frontend with token and user info
      // Determine which frontend URL to use based on the request origin or a default
      const frontendUrl = req.headers.referer 
        ? new URL(req.headers.referer).origin 
        : 'http://localhost:5173'; // Default frontend URL
      
      console.log('🔍 Redirecting to frontend URL:', frontendUrl);
      
      // Redirect with token as a query parameter
      res.redirect(`${frontendUrl}/google-auth-success?token=${token}&userId=${req.user._id}&name=${encodeURIComponent(req.user.name)}&email=${encodeURIComponent(req.user.email)}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      res.redirect('/login-failed');
    }
  }
);

// Login failed route
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: "Google authentication failed"
  });
});

// Debug route to check Google auth configuration
router.get('/debug-config', (req, res) => {
  res.json({
    googleConfigured: {
      clientID: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set",
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    jwtSecret: process.env.JWT_SECRET ? "Set" : "Not set",
    requestInfo: {
      headers: req.headers,
      origin: req.headers.origin,
      referer: req.headers.referer,
    }
  });
});

module.exports = router; // ✅ THIS MUST BE router
