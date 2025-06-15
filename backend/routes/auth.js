const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticateJWT = require('../middleware/authMiddleware');

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log("✅ Generated token for new user:", token ? "Yes (length: " + token.length + ")" : "No");
      
      // Verify the token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified successfully:", decoded);
    } catch (err) {
      console.error("❌ Error generating or verifying token:", err);
      // Generate a fallback token
      token = jwt.sign(
        { userId: user._id, fallback: true },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      console.log("✅ Generated fallback token, length:", token.length);
    }

    // Remove password before sending back
    const { password: _, ...userData } = user._doc;

    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    console.log("🔍 Login attempt with body:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    console.log("🔍 User found:", user.email);
    
    if (!user.password) {
      console.log("❌ User has no password (Google auth)");
      return res.status(400).json({ message: 'User registered with Google, please login with Google' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password doesn't match");
      return res.status(400).json({ message: 'Invalid email or password' });
    }    

    console.log("✅ Password verified, generating token");
    
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not set!");
      return res.status(500).json({ message: 'Server configuration error' });
    }

    let token;
    try {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log("✅ Token generated:", token ? "Yes (length: " + token.length + ")" : "No");
      
      // Verify the token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified successfully:", decoded);
    } catch (err) {
      console.error("❌ Error generating or verifying token:", err);
      // Generate a fallback token
      token = jwt.sign(
        { userId: user._id, fallback: true },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      console.log("✅ Generated fallback token, length:", token.length);
    }

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Get user info - supports both session and JWT authentication
router.get("/user", async (req, res) => {
  try {
    console.log("🔍 /api/auth/user endpoint called");
    console.log("🔍 Headers:", JSON.stringify(req.headers));
    
    // First check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    console.log("🔍 Authorization header:", authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log("🔍 Token found:", token ? "Yes (length: " + token.length + ")" : "No");
      
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET environment variable is not set!');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      
      console.log("🔍 JWT_SECRET is set, verifying token...");
      
      // Verify the token
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          console.error('❌ JWT verification error:', err.message);
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        console.log("✅ Token verified successfully, decoded:", JSON.stringify(decoded));
        
        // Token is valid, get the user from the database
        try {
          const user = await User.findById(decoded.userId).select('-password');
          if (!user) {
            console.error('❌ User not found with ID:', decoded.userId);
            return res.status(404).json({ message: 'User not found' });
          }
          console.log("✅ User found:", user.email);
          return res.json({ user });
        } catch (error) {
          console.error('❌ Database error:', error);
          return res.status(500).json({ message: 'Server error' });
        }
      });
    } 
    // If no JWT token, check for session-based authentication
    else if (req.user) {
      console.log("✅ Session-based authentication found, user:", req.user.email);
      res.json({ user: req.user }); // Using passport session
    } 
    // No authentication found
    else {
      console.log("❌ No authentication found");
      res.status(401).json({ message: "Not authenticated" });
    }
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to check JWT token
router.get("/debug-token", (req, res) => {
  const authHeader = req.headers.authorization;
  
  console.log("🔍 Debug Token Headers:", JSON.stringify(req.headers));
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ 
      message: "No token provided", 
      headers: req.headers,
      authHeader: authHeader 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ 
      message: "JWT_SECRET not set", 
      env: {
        JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not set",
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ 
      message: "Token valid", 
      decoded,
      token: token.substring(0, 10) + "..." // Show first 10 chars for security
    });
  } catch (err) {
    return res.status(401).json({ 
      message: "Token invalid", 
      error: err.message,
      token: token.substring(0, 10) + "..." // Show first 10 chars for security
    });
  }
});

// Generate test token endpoint
router.get("/generate-test-token", (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not set!");
      return res.status(500).json({ 
        message: "JWT_SECRET not set", 
        error: "Server configuration error" 
      });
    }
    
    // Generate a test token
    const testToken = jwt.sign(
      { 
        userId: req.user?.userId || "test-user-id",
        email: req.user?.email || "test@example.com",
        isTestToken: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Verify the token
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    
    console.log("✅ Generated test token:", testToken ? "Yes (length: " + testToken.length + ")" : "No");
    console.log("✅ Test token verified:", decoded);
    
    return res.json({
      message: "Test token generated successfully",
      token: testToken,
      tokenLength: testToken.length,
      decoded: decoded
    });
  } catch (err) {
    console.error("❌ Error generating test token:", err);
    return res.status(500).json({
      message: "Failed to generate test token",
      error: err.message
    });
  }
});

// Generate test token endpoint
router.get("/generate-test-token", (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ 
        message: "JWT_SECRET not set", 
        env: {
          JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not set",
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    // Generate a test token
    const testToken = jwt.sign(
      { userId: "test-user-id", test: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log("✅ Test token generated:", testToken);
    console.log("✅ Test token length:", testToken.length);
    
    return res.json({
      message: "Test token generated",
      token: testToken,
      tokenLength: testToken.length
    });
  } catch (err) {
    console.error("❌ Error generating test token:", err);
    return res.status(500).json({
      message: "Error generating test token",
      error: err.message
    });
  }
});

module.exports = router;
