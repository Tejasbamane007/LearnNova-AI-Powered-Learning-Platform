// middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log('🔍 Auth middleware called');
  console.log('🔍 Authorization header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'None');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    console.log('🔍 Token extracted, length:', token.length);

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET environment variable is not set!');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    try {
      // First check if token is valid format
      if (token.length < 100) {
        console.error('❌ Token too short:', token.length);
        console.error('❌ Invalid token:', token);
        
        // Generate a valid token for testing
        const testToken = jwt.sign(
          { userId: "test-user-id" },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        
        console.log('✅ Generated valid test token, length:', testToken.length);
        
        return res.status(403).json({ 
          message: 'Invalid token format',
          details: 'Token is too short to be valid',
          validTokenLength: testToken.length
        });
      }
      
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          console.error('❌ JWT verification error:', err.message);
          return res.status(403).json({ 
            message: 'Invalid or expired token',
            error: err.message
          });
        }

        console.log('✅ Token verified successfully');
        req.user = user;
        next();
      });
    } catch (err) {
      console.error('❌ Token processing error:', err);
      return res.status(403).json({ 
        message: 'Token processing error',
        error: err.message
      });
    }
  } else {
    console.error('❌ Authorization header missing or invalid');
    res.status(401).json({ 
      message: 'Authorization token missing',
      details: 'Please include a valid Bearer token in the Authorization header'
    });
  }
};

module.exports = authenticateJWT;
