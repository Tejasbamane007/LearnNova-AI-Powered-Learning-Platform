require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');
const courseRoutes = require('./routes/course');
const chatbot = require('./routes/chatbot');
const quizRoutes = require('./routes/quiz');
const timetableRoutes = require('./routes/timetableRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');

const app = express();

// 🔍 Debug Logs
console.log("✅ GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set");
console.log("✅ GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL ? "Set" : "Not set");
console.log("✅ GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Set" : "Not set");
console.log("✅ JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("✅ MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");

// ✅ CORS Middleware — must come *before* sessions
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if(!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:8080", 
      "http://localhost:3000", 
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8080"
    ];
    
    if(allowedOrigins.indexOf(origin) === -1){
      console.log("❌ CORS blocked request from:", origin);
    }
    
    // Always allow for development
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ JSON parser
app.use(express.json());

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Session setup — make sure this is before passport.session()
app.use(
  session({
    secret: process.env.JWT_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // should be true if using HTTPS in production
      sameSite: "lax", // allows cookies in most cross-origin cases
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
  })
);

// ✅ Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('✅ Google auth callback received for user:', profile.displayName);
    
    // Check if we have all the required profile information
    if (!profile.id || !profile.displayName || !profile.emails || !profile.emails[0].value) {
      console.error('❌ Missing required profile information from Google');
      return done(new Error('Invalid profile information from Google'), null);
    }
    
    // Look for existing user
    let user = await User.findOne({ googleId: profile.id });
    console.log('🔍 Existing user found:', user ? 'Yes' : 'No');

    if (!user) {
      // Also check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Update existing user with Google ID
        console.log('🔍 User found by email, updating with Google ID');
        user.googleId = profile.id;
        await user.save();
      } else {
        // Create new user
        console.log('🔍 Creating new user from Google profile');
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
        });
        await user.save();
      }
    }

    console.log('✅ Google authentication successful for:', user.email);
    return done(null, user);
  } catch (err) {
    console.error('❌ Google auth error:', err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
});

// ✅ Routes
app.use('/auth', googleAuthRoutes); // For Google login routes
app.use('/api/auth', authRoutes);   // Profile/info route
app.use('/api/course', courseRoutes);
app.use('/api/chatbot', chatbot);
app.use('/api/quiz', quizRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/pdf', pdfRoutes);

// 🔄 Health check
app.get('/', (req, res) => {
  res.send('✅ AI LMS Backend is live');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
