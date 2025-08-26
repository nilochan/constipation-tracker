require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Global username uniqueness checker
const ensureUsernameUnique = async (desiredUsername) => {
  let username = desiredUsername;
  let counter = 1;
  let existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
  
  while (existingUser) {
    username = `${desiredUsername}${counter}`;
    counter++;
    existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (counter > 100) { // Prevent infinite loop
      username = `${desiredUsername}_${Date.now()}`;
      break;
    }
  }
  
  return username;
};

// Activity logging function
const logActivity = async (userId, username, action, details = null, req = null) => {
  try {
    const ipAddress = req ? (req.ip || req.connection.remoteAddress || 'Unknown') : 'System';
    const userAgent = req ? (req.get('User-Agent') || 'Unknown') : 'System';
    
    await db.run(`
      INSERT INTO activity_log (user_id, username, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, username, action, details, ipAddress, userAgent]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory in persistent volume if available, fallback to local
const uploadsDir = process.env.DB_PATH ? 
  path.join(path.dirname(process.env.DB_PATH), 'uploads') :  // Use same volume as database
  path.join(__dirname, 'uploads');                          // Fallback for local dev

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
} else {
  console.log('📁 Using uploads directory:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const userId = req.user ? req.user.userId : 'temp';
    cb(null, 'profile-' + userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files from React build
app.use(express.static('../frontend/build'));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Session configuration for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.RAILWAY_SERVICE === 'constipation-tracker-staging'
    ? "https://web-staging-87ce.up.railway.app/api/auth/google/callback"
    : "https://chanchinthai.up.railway.app/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth profile:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    // Check if user exists with this Google ID
    let user = await db.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);
    
    if (!user) {
      // Check if user exists with this email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (user) {
          // Link Google account to existing user (handle schema gracefully)
          try {
            await db.run(
              'UPDATE users SET google_id = ?, auth_method = ? WHERE id = ?',
              [profile.id, 'google', user.id]
            );
          } catch (error) {
            if (error.message.includes('no such column')) {
              // Old schema - just update google_id if column exists
              try {
                await db.run(
                  'UPDATE users SET google_id = ? WHERE id = ?',
                  [profile.id, user.id]
                );
              } catch (innerError) {
                console.log('Cannot update google_id - old schema without multi-auth support');
              }
            } else {
              throw error;
            }
          }
          user.google_id = profile.id;
          user.auth_method = 'google';
        }
      }
    }

    if (!user) {
      // Create new user
      let username = profile.displayName?.replace(/\s+/g, '') || `google_user_${profile.id}`;
      const email = profile.emails?.[0]?.value;
      
      // Ensure username uniqueness across ALL auth methods
      const originalUsername = username;
      username = await ensureUsernameUnique(username);
      
      console.log(`🔐 Google OAuth username uniqueness: ${originalUsername} → ${username}`);
      
      // Create new user (handle schema gracefully)
      let result;
      try {
        result = await db.run(
          'INSERT INTO users (username, email, google_id, auth_method, is_admin) VALUES (?, ?, ?, ?, ?)',
          [username, email, profile.id, 'google', false]
        );
      } catch (error) {
        if (error.message.includes('no such column')) {
          // Fallback to old schema
          result = await db.run(
            'INSERT INTO users (username, email, is_admin) VALUES (?, ?, ?)',
            [username, email, false]
          );
        } else {
          throw error;
        }
      }
      
      user = {
        id: result.id,
        username,
        email,
        google_id: profile.id,
        auth_method: 'google',
        is_admin: false,
        profile_photo: null
      };

      await logActivity(user.id, user.username, 'GOOGLE_REGISTER', 'Account created via Google OAuth');
    } else {
      await logActivity(user.id, user.username, 'GOOGLE_LOGIN', 'Logged in via Google OAuth');
    }

    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

// Initialize Email transporter (using Gmail SMTP)
let emailTransporter = null;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,    // Your Gmail address
        pass: process.env.EMAIL_PASS     // Your Gmail app password
      }
    });
    console.log('📧 Email service configured with Gmail SMTP');
    // Test email configuration (don't send, just verify)
    emailTransporter.verify((error, success) => {
      if (error) {
        console.log('❌ Email configuration test failed:', error.message);
        emailTransporter = null; // Disable email if config is bad
      } else {
        console.log('✅ Email service ready for sending');
      }
    });
  } else {
    console.log('⚠️  Email service not configured (EMAIL_USER/EMAIL_PASS missing)');
  }
} catch (emailConfigError) {
  console.error('❌ Email configuration error:', emailConfigError.message);
  emailTransporter = null;
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Auth routes
app.post('/api/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').optional().isLength({ min: 6 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Final username uniqueness check (double protection across all auth methods)
    const finalUsername = await ensureUsernameUnique(username);
    if (finalUsername !== username) {
      console.log(`🔐 Password registration final username adjustment: ${username} → ${finalUsername}`);
      username = finalUsername;
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Create user (admin role can be granted later via admin button)
    let result;
    try {
      result = await db.run(
        'INSERT INTO users (username, password, email, is_admin, auth_method) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, email, false, password ? 'password' : 'other']
      );
    } catch (error) {
      console.log('🔧 Password registration schema error, trying fallback:', error.message);
      if (error.message.includes('no such column') || error.message.includes('auth_method')) {
        // Try basic schema - might not have is_admin either
        try {
          result = await db.run(
            'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, false]
          );
          console.log('✅ Password registration fallback with is_admin successful');
        } catch (fallbackError) {
          console.log('🔧 Further password fallback needed:', fallbackError.message);
          if (fallbackError.message.includes('NOT NULL constraint failed: users.password')) {
            // This shouldn't happen for password registration, but just in case
            result = await db.run(
              'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
              [username, email, hashedPassword || 'password_auth']
            );
            console.log('✅ Basic password fallback successful');
          } else {
            // Most basic schema
            result = await db.run(
              'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
              [username, hashedPassword, email]
            );
            console.log('✅ Most basic password fallback successful');
          }
        }
      } else {
        throw error;
      }
    }

    // Generate token
    const token = jwt.sign(
      { userId: result.id, username, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log registration activity
    await logActivity(result.id, username, 'REGISTER', 'User account created', req);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.id, username, email, profile_photo: null, is_admin: false }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', [
  body('username').trim().escape(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Find user
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user has a password (password-based auth)
    if (!user.password) {
      return res.status(401).json({ error: 'Please use Google or SMS authentication for this account' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log login activity
    await logActivity(user.id, user.username, 'LOGIN', null, req);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, profile_photo: user.profile_photo, is_admin: user.is_admin }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth Routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      console.log('🔍 Google OAuth callback reached!');
      console.log('🔍 User from OAuth:', req.user ? 'User found' : 'No user');
      console.log('🔍 Session info:', req.session ? 'Session exists' : 'No session');
      // Generate JWT token for consistency with existing auth
      const user = req.user;
      const token = jwt.sign(
        { userId: user.id, username: user.username, isAdmin: user.is_admin },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token - detect based on host  
      let redirectUrl;
      const host = req.get('host') || 'localhost';
      console.log('🌍 Request host:', host);
      
      if (host.includes('chanchinthai.up.railway.app')) {
        redirectUrl = `https://chanchinthai.up.railway.app/?token=${token}`;
      } else if (host.includes('web-staging-87ce.up.railway.app')) {
        redirectUrl = `https://web-staging-87ce.up.railway.app/?token=${token}`;
      } else if (host.includes('railway.app')) {
        // Fallback for other Railway URLs - use the same host
        redirectUrl = `https://${host}/?token=${token}`;
      } else {
        redirectUrl = `http://localhost:3000/?token=${token}`;
      }
      
      console.log(`🔑 Google OAuth redirect:`, redirectUrl);
      console.log(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV}, RAILWAY_ENVIRONMENT=${process.env.RAILWAY_ENVIRONMENT}`);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/login?error=oauth_error');
    }
  }
);

// Email OTP Routes (Free alternative to SMS)
app.post('/api/auth/send-email-otp', [
  body('email').isEmail().withMessage('Valid email address is required'),
  body('mode').optional().isIn(['signin', 'signup']).withMessage('Mode must be signin or signup')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, mode } = req.body;
    const normalizedEmail = email.toLowerCase().trim(); // Normalize email

    // Check email existence based on mode
    const existingEmailUser = await db.get('SELECT id, username FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
    
    if (mode === 'signup' && existingEmailUser) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please use "Sign In" to access your existing account.',
        existingAccount: true
      });
    }
    
    if (mode === 'signin' && !existingEmailUser) {
      return res.status(400).json({ 
        error: 'No account found with this email. Please use "Sign Up" to create a new account.',
        needsSignup: true
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Clear existing OTPs for this email
    await db.run('DELETE FROM email_otp WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);

    // Store OTP in database
    await db.run(
      'INSERT INTO email_otp (email, otp_code, expires_at) VALUES (?, ?, ?)',
      [normalizedEmail, otpCode, expiresAt.toISOString()]
    );

    // Send actual email
    try {
      console.log(`✅ Email OTP for ${normalizedEmail}: ${otpCode}`);
      console.log(`🕒 Expires at: ${expiresAt.toISOString()}`);

      // Send real email if email service is configured
      if (emailTransporter) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: normalizedEmail,
          subject: '🐰 Your Constipation Tracker Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981;">🐰 Constipation Tracker</h1>
                <h2 style="color: #374151;">Verification Code</h2>
              </div>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #1f2937; font-size: 36px; letter-spacing: 8px; margin: 0;">${otpCode}</h1>
                <p style="color: #6b7280; margin-top: 10px;">Your verification code</p>
              </div>
              
              <div style="color: #374151; line-height: 1.6;">
                <p>Hi there! 👋</p>
                <p>You requested a verification code to sign in to your Constipation Tracker account.</p>
                <p><strong>Your verification code is: ${otpCode}</strong></p>
                <p>This code will expire in <strong>5 minutes</strong> for security reasons.</p>
                <p>If you didn't request this code, you can safely ignore this email.</p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This email was sent from your Constipation Tracker application.<br>
                Please do not reply to this email.
              </p>
            </div>
          `
        };

        const result = await emailTransporter.sendMail(mailOptions);
        console.log(`📧 Email sent successfully to ${email}`);
        console.log(`📧 Email result:`, result.messageId ? 'Message ID: ' + result.messageId : 'No message ID');
        
        res.json({ 
          message: 'Verification code sent to your email',
          // Still show OTP in development for backup testing
          ...(process.env.NODE_ENV !== 'production' && { 
            otp: otpCode,
            debug: 'Email sent! Check your inbox and spam folder'
          })
        });
      } else {
        // Fallback to console logging if email not configured
        console.log('⚠️  Email service not configured, using console logging');
        res.json({ 
          message: 'Email service not configured - check console logs',
          otp: otpCode,
          debug: 'Configure EMAIL_USER and EMAIL_PASS environment variables for real email sending'
        });
      }
      
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ 
        error: 'Failed to send verification email. Please try again.',
        debug: process.env.NODE_ENV !== 'production' ? emailError.message : undefined
      });
    }

  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify-email-otp', [
  body('email').isEmail().withMessage('Valid email address is required'),
  body('otp_code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp_code, username } = req.body;
    const normalizedEmail = email.toLowerCase().trim(); // Normalize email

    // Get OTP record (case-insensitive email)
    const otpRecord = await db.get(
      'SELECT * FROM email_otp WHERE LOWER(email) = LOWER(?) AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail]
    );

    if (!otpRecord) {
      return res.status(400).json({ error: 'No valid OTP found for this email address' });
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempts
      await db.run(
        'UPDATE email_otp SET attempts = attempts + 1 WHERE id = ?',
        [otpRecord.id]
      );
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Mark OTP as verified
    await db.run(
      'UPDATE email_otp SET verified = TRUE WHERE id = ?',
      [otpRecord.id]
    );

    // Check if user exists with this email (case-insensitive)
    let user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);

    if (!user) {
      // No user found with this email
      if (!username || username.trim() === '') {
        return res.status(400).json({ 
          error: 'No account found with this email. Please use the Sign Up mode to create a new account.',
          requireSignUp: true
        });
      }

      // Create new user (sign up mode)
      const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      }
      
      // Check email uniqueness (this email should already be checked above, but double-check)
      const existingEmailUser = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
      if (existingEmailUser) {
        return res.status(400).json({ error: 'An account with this email already exists. Please use Sign In instead.' });
      }

      // Final username uniqueness check (double protection)
      const finalUsername = await ensureUsernameUnique(username);
      if (finalUsername !== username) {
        console.log(`🔐 Email OTP final username adjustment: ${username} → ${finalUsername}`);
        username = finalUsername;
      }

      // Try with new schema first, fallback to old schema
      let result;
      try {
        result = await db.run(
          'INSERT INTO users (username, email, auth_method, is_admin) VALUES (?, ?, ?, ?)',
          [username, normalizedEmail, 'email', false]
        );
      } catch (error) {
        console.log('🔧 Schema error, trying fallback:', error.message);
        if (error.message.includes('no such column') || error.message.includes('auth_method')) {
          // Try basic schema - might not have is_admin either
          try {
            result = await db.run(
              'INSERT INTO users (username, email, is_admin) VALUES (?, ?, ?)',
              [username, normalizedEmail, false]
            );
            console.log('✅ Fallback with is_admin successful');
          } catch (fallbackError) {
            console.log('🔧 Further fallback needed:', fallbackError.message);
            // Legacy schema with required password column
            if (fallbackError.message.includes('NOT NULL constraint failed: users.password')) {
              result = await db.run(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, normalizedEmail, 'email_auth'] // Placeholder password for email auth
              );
              console.log('✅ Legacy schema with password fallback successful');
            } else {
              // Even more basic schema
              result = await db.run(
                'INSERT INTO users (username, email) VALUES (?, ?)',
                [username, normalizedEmail]
              );
              console.log('✅ Basic fallback successful');
            }
          }
        } else {
          throw error;
        }
      }

      user = {
        id: result.id,
        username,
        email: normalizedEmail,
        auth_method: 'email',
        is_admin: false, // Default for new users
        profile_photo: null
      };

      console.log('✅ New user created:', { id: user.id, username: user.username, email: user.email });
      await logActivity(user.id, user.username, 'EMAIL_REGISTER', 'Account created via Email OTP');
    } else {
      // Existing user login - no username required
      console.log('✅ Existing user login:', { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin });
      await logActivity(user.id, user.username, 'EMAIL_LOGIN', 'Logged in via Email OTP');
    }

    // Generate JWT token (handle missing is_admin for legacy schemas)
    const isAdmin = user.is_admin || false;
    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const responseUser = { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      profile_photo: user.profile_photo || null, 
      is_admin: isAdmin
    };
    
    console.log('📤 Sending user data to frontend:', responseUser);
    
    res.json({
      message: 'Email verification successful',
      token,
      user: responseUser
    });

  } catch (error) {
    console.error('Verify Email OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check user emails (temporary)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, email, auth_method FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes
app.use('/api/data', authenticateToken);
app.use('/api/analytics', authenticateToken);
app.use('/api/profile', authenticateToken);
app.use('/api/ai', authenticateToken);

// Get daily data
app.get('/api/data/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.userId;

    // Get daily data
    const dailyData = await db.get(
      'SELECT * FROM daily_data WHERE user_id = ? AND date = ?',
      [userId, date]
    );

    // Get daily notes
    const dailyNotes = await db.all(
      'SELECT * FROM daily_notes WHERE user_id = ? AND date = ? ORDER BY created_at',
      [userId, date]
    );

    // Get bowel movements
    const bowelMovements = await db.all(
      'SELECT * FROM bowel_movements WHERE user_id = ? AND date = ? ORDER BY created_at',
      [userId, date]
    );

    // Get meals
    const meals = await db.all(
      'SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at',
      [userId, date]
    );

    // Get checklist items
    const checklistItems = await db.all(
      'SELECT * FROM checklist_items WHERE user_id = ? AND date = ?',
      [userId, date]
    );

    // Get symptoms
    const symptoms = await db.get(
      'SELECT * FROM symptoms WHERE user_id = ? AND date = ?',
      [userId, date]
    );

    // Format checklist items
    const checkedItems = {};
    checklistItems.forEach(item => {
      const key = `${item.category}-${item.item_index}`;
      checkedItems[key] = item.checked;
    });

    const result = {
      date,
      waterGlasses: dailyData?.water_glasses || 0,
      mood: dailyData?.mood || null,
      stressLevel: dailyData?.stress_level || null,
      sleepQuality: dailyData?.sleep_quality || null,
      notes: dailyData?.notes || '',
      dailyNotes: dailyNotes.map(note => ({
        id: note.id,
        note: note.note,
        createdAt: note.created_at
      })),
      bowelMovements: bowelMovements.map(bm => ({
        id: bm.id,
        date: bm.date,
        time: bm.time,
        bristolType: bm.bristol_type,
        urgency: bm.urgency,
        straining: Boolean(bm.straining),
        satisfaction: bm.satisfaction
      })),
      bowelMovement: bowelMovements.length > 0,
      meals: meals.map(meal => ({
        id: meal.id,
        mealType: meal.meal_type,
        foodItems: meal.food_items,
        portion: meal.portion,
        triggerFoods: meal.trigger_foods ? JSON.parse(meal.trigger_foods) : []
      })),
      checkedItems,
      symptoms: {
        bloating: symptoms?.bloating || 0,
        abdominalPain: symptoms?.abdominal_pain || 0,
        nausea: symptoms?.nausea || 0,
        fatigue: symptoms?.fatigue || 0
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update daily data
app.put('/api/data/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // Update or insert daily data
    if (updates.waterGlasses !== undefined || updates.mood !== undefined || 
        updates.stressLevel !== undefined || updates.sleepQuality !== undefined || 
        updates.notes !== undefined) {
      
      await db.run(`
        INSERT OR REPLACE INTO daily_data 
        (user_id, date, water_glasses, mood, stress_level, sleep_quality, notes, updated_at)
        VALUES (?, ?, 
          COALESCE(?, (SELECT water_glasses FROM daily_data WHERE user_id = ? AND date = ?)),
          COALESCE(?, (SELECT mood FROM daily_data WHERE user_id = ? AND date = ?)),
          COALESCE(?, (SELECT stress_level FROM daily_data WHERE user_id = ? AND date = ?)),
          COALESCE(?, (SELECT sleep_quality FROM daily_data WHERE user_id = ? AND date = ?)),
          COALESCE(?, (SELECT notes FROM daily_data WHERE user_id = ? AND date = ?)),
          CURRENT_TIMESTAMP
        )
      `, [
        userId, date,
        updates.waterGlasses, userId, date,
        updates.mood, userId, date,
        updates.stressLevel, userId, date,
        updates.sleepQuality, userId, date,
        updates.notes, userId, date
      ]);
    }

    // Update symptoms
    if (updates.symptoms) {
      await db.run(`
        INSERT OR REPLACE INTO symptoms 
        (user_id, date, bloating, abdominal_pain, nausea, fatigue, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId, date,
        updates.symptoms.bloating,
        updates.symptoms.abdominalPain,
        updates.symptoms.nausea,
        updates.symptoms.fatigue
      ]);
    }

    // Update checklist items
    if (updates.checkedItems) {
      for (const [key, checked] of Object.entries(updates.checkedItems)) {
        const [category, itemIndex] = key.split('-');
        await db.run(`
          INSERT OR REPLACE INTO checklist_items 
          (user_id, date, category, item_index, checked, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, date, category, parseInt(itemIndex), checked]);
      }
    }

    res.json({ message: 'Data updated successfully' });
  } catch (error) {
    console.error('Update data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add bowel movement
app.post('/api/data/:date/bowel-movements', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.userId;
    const { time, bristolType, urgency, straining, satisfaction } = req.body;

    const result = await db.run(`
      INSERT INTO bowel_movements (user_id, date, time, bristol_type, urgency, straining, satisfaction)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, date, time, bristolType, urgency, straining, satisfaction]);

    res.status(201).json({
      id: result.id,
      date,
      time,
      bristolType,
      urgency,
      straining: Boolean(straining),
      satisfaction
    });
  } catch (error) {
    console.error('Add bowel movement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete bowel movement
app.delete('/api/data/:date/bowel-movements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await db.run('DELETE FROM bowel_movements WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Bowel movement deleted successfully' });
  } catch (error) {
    console.error('Delete bowel movement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add daily note
app.post('/api/data/:date/notes', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.userId;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const result = await db.run(`
      INSERT INTO daily_notes (user_id, date, note)
      VALUES (?, ?, ?)
    `, [userId, date, note.trim()]);

    res.status(201).json({
      id: result.id,
      note: note.trim(),
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Add daily note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete daily note
app.delete('/api/data/:date/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await db.run('DELETE FROM daily_notes WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete daily note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add meal
app.post('/api/data/:date/meals', async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.userId;
    const { mealType, foodItems, portion, triggerFoods } = req.body;

    const result = await db.run(`
      INSERT INTO meals (user_id, date, meal_type, food_items, portion, trigger_foods)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, date, mealType, foodItems, portion, JSON.stringify(triggerFoods)]);

    res.status(201).json({
      id: result.id,
      mealType,
      foodItems,
      portion,
      triggerFoods
    });
  } catch (error) {
    console.error('Add meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get historical data for analytics
app.get('/api/analytics/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const userId = req.user.userId;

    const historicalData = await db.all(`
      SELECT 
        dd.date,
        dd.water_glasses,
        dd.mood,
        dd.stress_level,
        dd.sleep_quality,
        dd.notes,
        COUNT(bm.id) as bowel_movement_count,
        COUNT(m.id) as meal_count,
        s.bloating,
        s.abdominal_pain,
        s.nausea,
        s.fatigue
      FROM daily_data dd
      LEFT JOIN bowel_movements bm ON dd.user_id = bm.user_id AND dd.date = bm.date
      LEFT JOIN meals m ON dd.user_id = m.user_id AND dd.date = m.date
      LEFT JOIN symptoms s ON dd.user_id = s.user_id AND dd.date = s.date
      WHERE dd.user_id = ?
      GROUP BY dd.date
      ORDER BY dd.date DESC
      LIMIT ?
    `, [userId, parseInt(days)]);

    // Get Bristol scale distribution
    const bristolData = await db.all(`
      SELECT bristol_type, COUNT(*) as count
      FROM bowel_movements
      WHERE user_id = ?
      AND date >= date('now', '-' || ? || ' days')
      GROUP BY bristol_type
      ORDER BY bristol_type
    `, [userId, parseInt(days)]);

    // Get all daily notes from the past X days
    const dailyNotes = await db.all(`
      SELECT date, note, created_at, id
      FROM daily_notes
      WHERE user_id = ?
      AND date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC, created_at DESC
    `, [userId, parseInt(days)]);

    res.json({
      historicalData,
      bristolDistribution: bristolData,
      dailyNotes
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile management
app.get('/api/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await db.get('SELECT id, username, email, profile_photo, created_at FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/profile', [
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { email } = req.body;

    await db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    
    const updatedUser = await db.get('SELECT id, username, email, profile_photo, created_at FROM users WHERE id = ?', [userId]);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile photo
app.post('/api/profile/photo', authenticateToken, (req, res, next) => {
  // Create dynamic upload with authenticated user info
  const dynamicUpload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  }).single('photo');
  
  dynamicUpload(req, res, next);
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const userId = req.user.userId;
    const photoPath = `/uploads/${req.file.filename}`;

    // Delete old photo if exists
    const oldUser = await db.get('SELECT profile_photo FROM users WHERE id = ?', [userId]);
    if (oldUser?.profile_photo) {
      const oldPhotoPath = path.join(__dirname, oldUser.profile_photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update user with new photo path
    await db.run('UPDATE users SET profile_photo = ? WHERE id = ?', [photoPath, userId]);
    
    // Log photo upload activity
    await logActivity(userId, req.user.username, 'PROFILE_PHOTO_UPLOAD', `Uploaded: ${req.file.filename}`, req);
    
    const updatedUser = await db.get('SELECT id, username, email, profile_photo, created_at, is_admin FROM users WHERE id = ?', [userId]);
    res.json(updatedUser);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export user data
app.get('/api/profile/export', async (req, res) => {
  try {
    const userId = req.user.userId;
    const format = req.query.format || 'json'; // Default to JSON

    // Get user info
    const user = await db.get('SELECT username, email, created_at FROM users WHERE id = ?', [userId]);
    
    // Get all user data
    const dailyData = await db.all('SELECT * FROM daily_data WHERE user_id = ? ORDER BY date', [userId]);
    const bowelMovements = await db.all('SELECT * FROM bowel_movements WHERE user_id = ? ORDER BY date, time', [userId]);
    const meals = await db.all('SELECT * FROM meals WHERE user_id = ? ORDER BY date', [userId]);
    const symptoms = await db.all('SELECT * FROM symptoms WHERE user_id = ? ORDER BY date', [userId]);
    const dailyNotes = await db.all('SELECT * FROM daily_notes WHERE user_id = ? ORDER BY date, created_at', [userId]);

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // User Info Sheet
      const userSheet = XLSX.utils.json_to_sheet([{
        username: user.username,
        email: user.email || 'Not provided',
        memberSince: user.created_at,
        exportDate: new Date().toISOString()
      }]);
      XLSX.utils.book_append_sheet(workbook, userSheet, 'User Info');

      // Daily Data Sheet
      if (dailyData.length > 0) {
        const dailySheet = XLSX.utils.json_to_sheet(dailyData.map(d => ({
          Date: d.date,
          'Water Glasses': d.water_glasses,
          Mood: d.mood,
          'Stress Level': d.stress_level,
          'Sleep Quality': d.sleep_quality,
          Notes: d.notes,
          'Updated At': d.updated_at
        })));
        XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Tracking');
      }

      // Bowel Movements Sheet
      if (bowelMovements.length > 0) {
        const bowelSheet = XLSX.utils.json_to_sheet(bowelMovements.map(bm => ({
          Date: bm.date,
          Time: bm.time,
          'Bristol Type': bm.bristol_type,
          Urgency: bm.urgency,
          Straining: bm.straining ? 'Yes' : 'No',
          Satisfaction: bm.satisfaction,
          'Recorded At': bm.created_at
        })));
        XLSX.utils.book_append_sheet(workbook, bowelSheet, 'Bowel Movements');
      }

      // Meals Sheet
      if (meals.length > 0) {
        const mealsSheet = XLSX.utils.json_to_sheet(meals.map(m => ({
          Date: m.date,
          'Meal Type': m.meal_type,
          'Food Items': m.food_items,
          Portion: m.portion,
          'Trigger Foods': m.trigger_foods,
          'Recorded At': m.created_at
        })));
        XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Meals');
      }

      // Symptoms Sheet
      if (symptoms.length > 0) {
        const symptomsSheet = XLSX.utils.json_to_sheet(symptoms.map(s => ({
          Date: s.date,
          Bloating: s.bloating,
          'Abdominal Pain': s.abdominal_pain,
          Nausea: s.nausea,
          Fatigue: s.fatigue,
          'Updated At': s.updated_at
        })));
        XLSX.utils.book_append_sheet(workbook, symptomsSheet, 'Symptoms');
      }

      // Daily Notes Sheet
      if (dailyNotes.length > 0) {
        const notesSheet = XLSX.utils.json_to_sheet(dailyNotes.map(n => ({
          Date: n.date,
          Note: n.note,
          'Created At': n.created_at
        })));
        XLSX.utils.book_append_sheet(workbook, notesSheet, 'Daily Notes');
      }

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${user.username}_health_data_${dateStr}.xlsx"`);
      res.send(excelBuffer);
    } else {
      // JSON format (original)
      const exportData = {
        user,
        exportDate: new Date().toISOString(),
        data: {
          dailyData,
          bowelMovements,
          meals,
          symptoms,
          dailyNotes
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${user.username}_health_data_${dateStr}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Summary and Chat using DeepSeek
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key';

// Chat history will be stored in SQLite and analyzed with DeepSeek

// DeepSeek-powered chat analysis functions
const extractChatKeywords = async (message) => {
  try {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key') {
      return null;
    }

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{
        role: 'user',
        content: `Extract 3-5 key concepts from this message as a JSON array: "${message.substring(0, 500)}"`
      }],
      max_tokens: 100
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    const keywords = response.data.choices[0].message.content;
    return keywords;
  } catch (error) {
    console.log('DeepSeek keyword extraction failed:', error.message);
    return null;
  }
};

// Generate daily summary
app.post('/api/ai/daily-summary', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.body;
    
    // Get user info for personalized greeting
    const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
    
    // Get today's data with more detailed information
    const dailyData = await db.get('SELECT * FROM daily_data WHERE user_id = ? AND date = ?', [userId, date]);
    const bowelMovements = await db.all('SELECT bristol_type as bristol_scale, time as timing, created_at as notes FROM bowel_movements WHERE user_id = ? AND date = ?', [userId, date]);
    const symptoms = await db.get('SELECT * FROM symptoms WHERE user_id = ? AND date = ?', [userId, date]);
    const notes = await db.all('SELECT note FROM daily_notes WHERE user_id = ? AND date = ?', [userId, date]);

    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Singapore',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    // DEBUG: Log what data we found for daily summary
    console.log('=== DAILY SUMMARY DEBUG ===');
    console.log('Date:', date);
    console.log('Daily Data:', dailyData);
    console.log('Bowel Movements:', bowelMovements);
    console.log('Symptoms:', symptoms);
    console.log('Notes:', notes);
    console.log('============================');
    
    // Create detailed bowel movement summary
    const bmDetails = bowelMovements.map(bm => 
      `Bristol ${bm.bristol_scale} at ${bm.timing}${bm.notes ? ' (Note: ' + bm.notes + ')' : ''}`
    ).join(', ') || 'None recorded';

    const prompt = `You are a caring health assistant providing daily health insights. NEVER start with "Of course!" - always start with a personalized greeting.

Data for ${date}:
- Water intake: ${dailyData?.water_glasses || 0} glasses
- Mood: ${dailyData?.mood || 'Not recorded'}/5  
- Stress level: ${dailyData?.stress_level || 'Not recorded'}/10
- Sleep quality: ${dailyData?.sleep_quality || 'Not recorded'}/5
- Bowel movements: ${bmDetails}
- Symptoms: Bloating ${symptoms?.bloating || 0}/5, Abdominal pain ${symptoms?.abdominal_pain || 0}/5
- Daily notes/remarks: ${notes?.map(n => n.note).join('; ') || 'None'}

Start your response with "Dear ${user?.username || 'there'}," and provide a brief, encouraging daily health summary (2-3 sentences) focusing on positives and gentle suggestions for improvement. Be warm and supportive.`;

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({ summary: response.data.choices[0].message.content });
  } catch (error) {
    console.error('AI Summary error:', error.response?.data || error.message);
    res.json({ summary: "Great job tracking your health today! Keep up the good work with hydration and mindful wellness monitoring. 🌟" });
  }
});

// Generate weekly summary
app.post('/api/ai/weekly-summary', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info for personalized greeting
    const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
    
    // Get past 7 days data
    const weekData = await db.all(`
      SELECT dd.date, dd.water_glasses, dd.mood, dd.stress_level, dd.sleep_quality,
             COUNT(bm.id) as bowel_movements
      FROM daily_data dd
      LEFT JOIN bowel_movements bm ON dd.user_id = bm.user_id AND dd.date = bm.date
      WHERE dd.user_id = ? AND dd.date >= date('now', '-7 days')
      GROUP BY dd.date
      ORDER BY dd.date DESC
    `, [userId]);

    const avgWater = weekData.reduce((sum, day) => sum + (day.water_glasses || 0), 0) / 7;
    const avgMood = weekData.filter(d => d.mood).reduce((sum, day) => sum + day.mood, 0) / weekData.filter(d => d.mood).length || 0;
    const totalBM = weekData.reduce((sum, day) => sum + (day.bowel_movements || 0), 0);

    const prompt = `You are a caring health assistant providing weekly health insights. NEVER start with "Of course!" - always start with a personalized greeting.

Past 7 days summary:
- Average water intake: ${avgWater.toFixed(1)} glasses/day
- Average mood: ${avgMood.toFixed(1)}/5
- Total bowel movements: ${totalBM}
- Days tracked: ${weekData.length}

Start your response with "Dear ${user?.username || 'there'}," and provide a supportive weekly health summary (3-4 sentences) with gentle insights and encouragement for the coming week.`;

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({ summary: response.data.choices[0].message.content });
  } catch (error) {
    console.error('AI Weekly Summary error:', error.response?.data || error.message);
    res.json({ summary: "You've made great progress this week with your health tracking! Keep staying mindful of your wellness journey. 🌟" });
  }
});

// Upload and process chat history (Admin only)
// Simple chat history upload with DeepSeek analysis
app.post('/api/ai/upload-chat-history', authenticateToken, requireAdmin, [
  body('chatHistory').isArray({ min: 1 }),
  body('source').isIn(['whatsapp', 'line', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { chatHistory, source } = req.body;

    console.log(`📥 Chat history upload: ${chatHistory.length} messages from ${source}`);

    let processed = 0;
    let skipped = 0;

    // Process messages in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < chatHistory.length; i += batchSize) {
      const batch = chatHistory.slice(i, i + batchSize);
      
      for (const chat of batch) {
        try {
          // Skip invalid messages
          if (!chat.message || !chat.sender || chat.message.length < 2) {
            skipped++;
            continue;
          }

          // Extract date from timestamp or use current date
          let chatDate = new Date().toISOString().split('T')[0];
          if (chat.timestamp) {
            try {
              chatDate = new Date(chat.timestamp).toISOString().split('T')[0];
            } catch (dateError) {
              console.log('Invalid timestamp, using current date:', chat.timestamp);
            }
          }

          // Store in SQLite for reliable access
          await db.run(`
            INSERT INTO chat_history (user_id, source, date, sender, message)
            VALUES (?, ?, ?, ?, ?)
          `, [userId, source, chatDate, chat.sender, chat.message.substring(0, 2000)]);
          
          processed++;
        } catch (insertError) {
          console.error('Error inserting message:', insertError);
          skipped++;
        }
      }
      
      console.log(`📊 Processed batch ${Math.floor(i/batchSize) + 1}: ${batch.length} messages`);
    }

    // Log activity
    await logActivity(userId, req.user.username, 'CHAT_HISTORY_UPLOAD', 
      `Uploaded ${processed} messages from ${source} (skipped ${skipped})`, req);

    res.json({ 
      message: `Successfully uploaded ${processed} chat messages from ${source}`,
      processed: processed,
      skipped: skipped,
      totalReceived: chatHistory.length,
      features: [
        "📅 Date-based organization",
        "🔍 Smart search by date ranges", 
        "📊 DeepSeek-powered analysis",
        "🎯 'This day last year' insights"
      ]
    });

  } catch (error) {
    console.error('Chat history upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat history',
      details: error.message
    });
  }
});

// Debug endpoint to check daily notes
app.get('/api/debug/daily-notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get ALL daily notes for this user
    const allNotes = await db.all(`
      SELECT id, user_id, date, note, created_at 
      FROM daily_notes 
      WHERE user_id = ? 
      ORDER BY date DESC, created_at DESC
    `, [userId]);

    res.json({
      userId,
      totalNotes: allNotes.length,
      notes: allNotes,
      message: 'All daily notes for debugging'
    });
  } catch (error) {
    console.error('Daily notes debug error:', error);
    res.status(500).json({ error: 'Failed to get daily notes debug data' });
  }
});

// Debug endpoint to check AI data retrieval
app.get('/api/ai/debug-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    
    const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
    const recentData = await db.get(`
      SELECT dd.water_glasses, dd.mood, dd.stress_level, dd.sleep_quality, dd.date
      FROM daily_data dd
      WHERE dd.user_id = ? AND (dd.date = ? OR dd.date >= date('now', '-14 days'))
      ORDER BY CASE WHEN dd.date = ? THEN 0 ELSE 1 END, dd.date DESC
      LIMIT 1
    `, [userId, today, today]);

    // Get all user dates for comparison
    const allDates = await db.all('SELECT DISTINCT date FROM daily_data WHERE user_id = ? ORDER BY date DESC LIMIT 10', [userId]);

    res.json({
      user,
      recentData,
      today,
      allUserDates: allDates.map(d => d.date),
      serverTime: new Date().toISOString(),
      serverTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      message: 'Debug data for AI chat'
    });
  } catch (error) {
    console.error('Debug data error:', error);
    res.status(500).json({ error: 'Failed to get debug data' });
  }
});

// ASK AI with comprehensive database integration and personalized DeepSeek responses
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🧠 ASK AI request from user:', req.user.username);
    console.log('📝 Question:', message);

    // Get user's recent health data for context
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
    
    // Get recent daily data
    const recentData = await db.all(`
      SELECT date, water_glasses, mood, stress_level, sleep_quality, notes
      FROM daily_data 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC LIMIT 7
    `, [userId, weekAgo, today]);

    // Get recent bowel movements
    const recentBowelMovements = await db.all(`
      SELECT date, time, bristol_type, urgency, straining, satisfaction
      FROM bowel_movements 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC, time DESC LIMIT 10
    `, [userId, weekAgo, today]);

    // Get recent symptoms
    const recentSymptoms = await db.all(`
      SELECT date, bloating, abdominal_pain, nausea, fatigue
      FROM symptoms 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC LIMIT 7
    `, [userId, weekAgo, today]);

    // Get recent meals
    const recentMeals = await db.all(`
      SELECT date, meal_type, food_items, trigger_foods
      FROM meals 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC LIMIT 10
    `, [userId, weekAgo, today]);

    // Get recent daily notes
    const recentNotes = await db.all(`
      SELECT date, note
      FROM daily_notes 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC LIMIT 10
    `, [userId, weekAgo, today]);

    console.log('📊 Retrieved user data:', {
      dailyData: recentData.length,
      bowelMovements: recentBowelMovements.length,
      symptoms: recentSymptoms.length,
      meals: recentMeals.length,
      notes: recentNotes.length
    });

    // Format context data for DeepSeek
    let healthContext = `User: ${user?.username || 'User'}\n`;
    healthContext += `Recent Health Data (Past 7 days):\n\n`;

    // Add daily data context
    if (recentData.length > 0) {
      healthContext += `Daily Tracking:\n`;
      recentData.forEach(day => {
        healthContext += `• ${day.date}: Water ${day.water_glasses || 0} glasses, Mood ${day.mood || 'N/A'}/5, Stress ${day.stress_level || 'N/A'}/10, Sleep ${day.sleep_quality || 'N/A'}/5\n`;
        if (day.notes) healthContext += `  Notes: ${day.notes}\n`;
      });
      healthContext += '\n';
    }

    // Add bowel movement context
    if (recentBowelMovements.length > 0) {
      healthContext += `Recent Bowel Movements:\n`;
      recentBowelMovements.slice(0, 5).forEach(bm => {
        healthContext += `• ${bm.date} ${bm.time}: Bristol Type ${bm.bristol_type}, Urgency ${bm.urgency}/5, Straining: ${bm.straining ? 'Yes' : 'No'}, Satisfaction ${bm.satisfaction}/5\n`;
      });
      healthContext += '\n';
    }

    // Add symptoms context
    if (recentSymptoms.length > 0) {
      healthContext += `Recent Symptoms:\n`;
      recentSymptoms.forEach(symptom => {
        if (symptom.bloating > 0 || symptom.abdominal_pain > 0 || symptom.nausea > 0 || symptom.fatigue > 0) {
          healthContext += `• ${symptom.date}: Bloating ${symptom.bloating}/5, Pain ${symptom.abdominal_pain}/5, Nausea ${symptom.nausea}/5, Fatigue ${symptom.fatigue}/5\n`;
        }
      });
      healthContext += '\n';
    }

    // Add meals context
    if (recentMeals.length > 0) {
      healthContext += `Recent Meals:\n`;
      recentMeals.slice(0, 3).forEach(meal => {
        healthContext += `• ${meal.date} ${meal.meal_type}: ${meal.food_items}`;
        if (meal.trigger_foods) healthContext += ` (Triggers: ${meal.trigger_foods})`;
        healthContext += '\n';
      });
      healthContext += '\n';
    }

    // Add daily notes context
    if (recentNotes.length > 0) {
      healthContext += `Recent Notes:\n`;
      recentNotes.slice(0, 3).forEach(note => {
        healthContext += `• ${note.date}: ${note.note}\n`;
      });
      healthContext += '\n';
    }

    // Create personalized prompt for DeepSeek
    const personalizedPrompt = `You are a caring health assistant for ${user?.username || 'the user'}. Based on their recent health data, provide a personalized, supportive response to their question.

${healthContext}

User's Question: ${message}

Instructions:
- Give personalized advice based on their actual health data shown above
- Be warm, supportive, and encouraging
- Reference specific patterns you see in their data when relevant
- Keep response concise (2-3 sentences max)
- Always remind them to consult a doctor for medical concerns
- Use supportive emojis appropriately`;

    // Call DeepSeek API
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key') {
      console.log('⚠️ DeepSeek API key not configured, using fallback response');
      return res.json({
        response: "I'm here to help with your health questions! Try asking about hydration, digestive health, or wellness tips. For specific medical concerns, please consult your doctor. 💙",
        timestamp: new Date().toISOString()
      });
    }

    console.log('🚀 Calling DeepSeek API for personalized response...');
    
    const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: personalizedPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const aiResponse = deepseekResponse.data.choices[0].message.content;
    
    console.log('✅ DeepSeek response generated successfully');

    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString(),
      hasHealthContext: recentData.length > 0 || recentBowelMovements.length > 0
    });

  } catch (error) {
    console.error('ASK AI error:', error);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.json({
        response: "I'm having trouble connecting to the AI service right now. Please try again in a moment! 🤖",
        timestamp: new Date().toISOString()
      });
    }

    if (error.response?.status === 429) {
      return res.json({
        response: "I'm getting too many requests right now. Please wait a moment and try again! ⏰",
        timestamp: new Date().toISOString()
      });
    }

    // Fallback response
    res.json({
      response: "I'm here to help with your health questions! Try asking about hydration, digestive health, or wellness tips. For specific medical concerns, please consult your doctor. 💙",
      timestamp: new Date().toISOString()
    });
  }
});

// Admin dashboard - Activity logs (Admin only)
app.get('/api/admin/activity-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const logs = await db.all(`
      SELECT al.*, u.email, u.created_at as user_created_at
      FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // Convert UTC timestamps to Singapore time (+8 hours)
    const logsWithSingaporeTime = logs.map(log => ({
      ...log,
      created_at: new Date(new Date(log.created_at).getTime() + (8 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19),
      user_created_at: log.user_created_at ? new Date(new Date(log.user_created_at).getTime() + (8 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19) : null
    }));

    const totalCount = await db.get('SELECT COUNT(*) as count FROM activity_log');
    
    res.json({
      logs: logsWithSingaporeTime,
      total: totalCount.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Admin activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Promote user to admin (Special endpoint with secret key)
app.post('/api/admin/promote', async (req, res) => {
  try {
    const { username, adminSecret } = req.body;
    
    // Check admin secret key (you can set this in environment variables)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-promote-secret-2024';
    
    // Debug logging
    console.log('Admin promotion attempt:', {
      username,
      providedSecret: adminSecret,
      expectedSecret: ADMIN_SECRET,
      match: adminSecret === ADMIN_SECRET
    });
    
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }

    // Find user
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Promote to admin
    await db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [user.id]);
    
    // Log admin promotion
    await logActivity(user.id, username, 'ADMIN_PROMOTION', 'User promoted to admin', req);

    res.json({ message: `User ${username} has been promoted to admin` });
  } catch (error) {
    console.error('Admin promotion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin dashboard - Database overview (Admin only)
app.get('/api/admin/database-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get comprehensive database statistics
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const totalAdmins = await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = TRUE');
    const totalRegularUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE');
    
    const totalDailyData = await db.get('SELECT COUNT(*) as count FROM daily_data');
    const totalBowelMovements = await db.get('SELECT COUNT(*) as count FROM bowel_movements');
    const totalMeals = await db.get('SELECT COUNT(*) as count FROM meals');
    const totalNotes = await db.get('SELECT COUNT(*) as count FROM daily_notes');
    const totalActivityLogs = await db.get('SELECT COUNT(*) as count FROM activity_log');
    
    // Recent activity (last 7 days)
    const recentUsers = await db.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    
    const recentActivity = await db.get(`
      SELECT COUNT(*) as count FROM activity_log 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    
    // Most active users
    const mostActiveUsers = await db.all(`
      SELECT 
        u.username,
        u.email,
        u.created_at,
        COUNT(DISTINCT dd.date) as days_tracked,
        COUNT(DISTINCT al.id) as total_actions
      FROM users u
      LEFT JOIN daily_data dd ON u.id = dd.user_id
      LEFT JOIN activity_log al ON u.id = al.user_id
      WHERE u.is_admin = FALSE
      GROUP BY u.id
      ORDER BY total_actions DESC, days_tracked DESC
      LIMIT 10
    `);

    res.json({
      database: {
        totalUsers: totalUsers.count,
        totalAdmins: totalAdmins.count,
        totalRegularUsers: totalRegularUsers.count,
        totalDailyData: totalDailyData.count,
        totalBowelMovements: totalBowelMovements.count,
        totalMeals: totalMeals.count,
        totalNotes: totalNotes.count,
        totalActivityLogs: totalActivityLogs.count
      },
      recent: {
        newUsersLast7Days: recentUsers.count,
        actionsLast7Days: recentActivity.count
      },
      mostActiveUsers
    });
  } catch (error) {
    console.error('Admin database stats error:', error);
    res.status(500).json({ error: 'Failed to fetch database stats' });
  }
});

// Admin dashboard - User stats (Admin only)
app.get('/api/admin/user-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userStats = await db.all(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.created_at,
        u.is_admin,
        COUNT(DISTINCT dd.date) as days_tracked,
        COUNT(DISTINCT bm.id) as total_bowel_movements,
        COUNT(DISTINCT dn.id) as total_notes,
        MAX(al.created_at) as last_activity
      FROM users u
      LEFT JOIN daily_data dd ON u.id = dd.user_id
      LEFT JOIN bowel_movements bm ON u.id = bm.user_id
      LEFT JOIN daily_notes dn ON u.id = dn.user_id
      LEFT JOIN activity_log al ON u.id = al.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ users: userStats });
  } catch (error) {
    console.error('Admin user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Debug endpoint to check admin secret (remove in production)
app.get('/api/debug/admin-secret', (req, res) => {
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-promote-secret-2024';
  res.json({ 
    adminSecret: ADMIN_SECRET,
    message: 'This endpoint should be removed in production',
    envCheck: {
      hasEnvSecret: !!process.env.ADMIN_SECRET,
      usingDefault: !process.env.ADMIN_SECRET
    }
  });
});

// Emergency admin promotion (remove in production)
app.post('/api/debug/emergency-admin', async (req, res) => {
  try {
    console.log('Emergency admin promotion request:', req.body);
    
    const { username } = req.body;
    
    if (!username) {
      console.log('No username provided');
      return res.status(400).json({ error: 'Username required' });
    }

    console.log('Looking for user:', username);
    
    // Find user
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    console.log('Found user:', user);
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_admin) {
      console.log('User is already admin');
      return res.json({ message: `${username} is already an admin` });
    }

    console.log('Promoting user to admin...');
    
    // Promote to admin
    await db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [user.id]);
    
    console.log('Admin promotion successful');
    
    // Log admin promotion
    await logActivity(user.id, username, 'EMERGENCY_ADMIN_PROMOTION', 'Emergency admin promotion via debug endpoint', req);

    res.json({ message: `${username} has been promoted to admin via emergency method` });
  } catch (error) {
    console.error('Emergency admin promotion error:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// Simple admin promotion without auth (emergency fallback)
app.post('/api/debug/make-admin', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Get all users if no username provided
    if (!username) {
      const users = await db.all('SELECT id, username, is_admin FROM users');
      return res.json({ users, message: 'Provide username to promote' });
    }
    
    // Promote user
    const result = await db.run('UPDATE users SET is_admin = TRUE WHERE username = ?', [username]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `${username} promoted to admin`, changes: result.changes });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (for debugging)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at');
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset all users to non-admin (one-time fix)
app.post('/api/debug/reset-all-admins', async (req, res) => {
  try {
    const result = await db.run('UPDATE users SET is_admin = FALSE');
    res.json({ message: `Reset complete. ${result.changes} users set to non-admin.` });
  } catch (error) {
    console.error('Reset all admins error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh user data (get updated user info)
app.get('/api/user/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await db.get('SELECT id, username, email, profile_photo, is_admin, created_at FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new token with updated admin status
    const newToken = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token: newToken,
      user: user
    });
  } catch (error) {
    console.error('Refresh user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tetris score API endpoints
app.post('/api/tetris/score', authenticateToken, async (req, res) => {
  try {
    const { score, lines, level } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    if (!score || !lines || !level) {
      return res.status(400).json({ error: 'Score, lines, and level are required' });
    }

    await db.run(
      'INSERT INTO tetris_scores (user_id, username, score, lines, level) VALUES (?, ?, ?, ?, ?)',
      [userId, username, score, lines, level]
    );

    res.json({ message: 'Score saved successfully' });
  } catch (error) {
    console.error('Save Tetris score error:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.get('/api/tetris/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = await db.all(
      `SELECT username, score, lines, level, created_at, 
              ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC) as rank
       FROM tetris_scores 
       ORDER BY score DESC, created_at ASC 
       LIMIT ?`,
      [limit]
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('Get Tetris leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});


// Serve React app for all non-API routes
app.get('*', (req, res) => {
  try {
    res.sendFile('index.html', { root: '../frontend/build' });
  } catch (error) {
    console.error('Static file serve error:', error);
    res.status(404).send('App not found');
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with error handling
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at /api/health`);
  });
  
  server.on('error', (error) => {
    console.error('Server startup error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  process.exit(0);
});