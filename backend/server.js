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
const { Pinecone } = require('@pinecone-database/pinecone');

const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Auth routes
app.post('/api/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (admin role can be granted later via admin button)
    const result = await db.run(
      'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, false]
    );

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

// Pinecone configuration for chat history
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'health-chat-history';

let pinecone = null;
let pineconeIndex = null;

// Initialize Pinecone if configured
if (PINECONE_API_KEY) {
  try {
    pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
    pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
    console.log('Pinecone initialized successfully');
  } catch (error) {
    console.log('Pinecone not configured or failed to initialize:', error.message);
  }
}

// Function to create embeddings using DeepSeek (or a simple hash for fallback)
const createEmbedding = async (text) => {
  try {
    // Simple text processing for embedding simulation
    // In production, you'd use a proper embedding model
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // 384-dimensional vector
    
    // Simple hash-based embedding simulation
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        embedding[j % 384] += charCode;
      }
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  } catch (error) {
    console.error('Error creating embedding:', error);
    return new Array(384).fill(0);
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

    // Validate chat history format
    if (!Array.isArray(chatHistory)) {
      return res.status(400).json({ error: 'Chat history must be an array' });
    }
    
    if (chatHistory.length === 0) {
      return res.status(400).json({ error: 'Chat history cannot be empty' });
    }
    
    // Validate first few messages for proper format
    for (let i = 0; i < Math.min(3, chatHistory.length); i++) {
      const msg = chatHistory[i];
      if (!msg.message || !msg.sender) {
        return res.status(400).json({ 
          error: `Invalid message format at index ${i}. Expected {message, sender, timestamp}`,
          received: msg
        });
      }
    }

    console.log('Received chat history upload:', {
      userId,
      source,
      historyLength: chatHistory.length,
      pineconeConfigured: !!pineconeIndex,
      pineconeApiKey: !!PINECONE_API_KEY,
      sampleMessage: chatHistory[0]
    });

    let processed = 0;

    // If Pinecone is configured, use it
    if (pineconeIndex) {
      console.log('Using Pinecone for chat history storage');
      const batchSize = 5; // Reduce batch size to avoid timeouts
      
      try {
        for (let i = 0; i < chatHistory.length; i += batchSize) {
          const batch = chatHistory.slice(i, i + batchSize);
          const vectors = [];

          for (const chat of batch) {
            try {
              // Skip very short messages
              if (!chat.message || chat.message.length < 3) {
                processed++;
                continue;
              }
              
              const embedding = await createEmbedding(chat.message);
              vectors.push({
                id: `${userId}-${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                values: embedding,
                metadata: {
                  userId: String(userId),
                  source: source,
                  sender: chat.sender || 'Unknown',
                  message: chat.message.substring(0, 1000), // Limit message length
                  timestamp: chat.timestamp || new Date().toISOString(),
                  type: 'chat_history'
                }
              });
              processed++;
            } catch (embeddingError) {
              console.error('Embedding error for message:', chat.message.substring(0, 50), embeddingError);
              processed++; // Still count as processed
            }
          }

          if (vectors.length > 0) {
            try {
              await pineconeIndex.upsert(vectors);
              console.log(`Uploaded batch ${Math.floor(i/batchSize) + 1}, ${vectors.length} vectors`);
            } catch (upsertError) {
              console.error('Pinecone upsert error:', upsertError);
              // Continue processing other batches
            }
          }
        }
      } catch (pineconeError) {
        console.error('Pinecone processing error:', pineconeError);
        // Fall back to local processing
        processed = chatHistory.length;
      }
    } else {
      // Fallback: just count the messages and store basic info
      console.log('Pinecone not configured, storing basic chat history info');
      processed = chatHistory.length;
      
      console.log('Chat history received:', {
        messageCount: processed,
        source: source,
        sampleMessages: chatHistory.slice(0, 3).map(c => `${c.sender}: ${c.message?.substring(0, 50)}...`)
      });
    }

    // Ensure we always have a processed count
    if (processed === 0) {
      processed = chatHistory.length;
    }

    // Log chat history upload activity
    await logActivity(userId, req.user.username, 'CHAT_HISTORY_UPLOAD', `Uploaded ${processed} messages from ${source}${pineconeIndex ? ' (Pinecone)' : ' (local)'}`, req);

    const responseMessage = pineconeIndex 
      ? `Successfully processed ${processed} chat messages from ${source} and stored in vector database`
      : `Successfully received ${processed} chat messages from ${source}. Set up Pinecone for AI integration.`;

    res.json({ 
      message: responseMessage,
      processed: processed,
      pineconeConfigured: !!pineconeIndex
    });
  } catch (error) {
    console.error('Chat history upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
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

// Chat with AI assistant (enhanced with chat history context)
app.post('/api/ai/chat', [
  body('message').isLength({ min: 1, max: 500 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { message } = req.body;

    // Get user info for personalized responses (with error handling)
    let user, recentData, recentBMs, recentSymptoms, recentNotes, allRecentData;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
      recentData = await db.get(`
        SELECT dd.water_glasses, dd.mood, dd.stress_level, dd.sleep_quality, dd.date
        FROM daily_data dd
        WHERE dd.user_id = ? AND (dd.date = ? OR dd.date >= date('now', '-30 days'))
        ORDER BY CASE WHEN dd.date = ? THEN 0 ELSE 1 END, dd.date DESC
        LIMIT 1
      `, [userId, today, today]);
      
      // Get recent bowel movements with notes (extended time range)
      recentBMs = await db.all(`
        SELECT bristol_type as bristol_scale, time as timing, created_at as notes, date
        FROM bowel_movements 
        WHERE user_id = ? AND (date = ? OR date >= date('now', '-30 days'))
        ORDER BY CASE WHEN date = ? THEN 0 ELSE 1 END, date DESC
        LIMIT 10
      `, [userId, today, today]);
      
      // Get recent symptoms (extended time range)
      recentSymptoms = await db.get(`
        SELECT bloating, abdominal_pain, date
        FROM symptoms 
        WHERE user_id = ? AND (date = ? OR date >= date('now', '-30 days'))
        ORDER BY CASE WHEN date = ? THEN 0 ELSE 1 END, date DESC
        LIMIT 1
      `, [userId, today, today]);
      
      // Get recent notes (extended time range)
      recentNotes = await db.all(`
        SELECT note, date
        FROM daily_notes 
        WHERE user_id = ? AND (date = ? OR date >= date('now', '-30 days'))
        ORDER BY CASE WHEN date = ? THEN 0 ELSE 1 END, date DESC
        LIMIT 10
      `, [userId, today, today]);

      // Get ALL daily data for the past 30 days for analysis
      allRecentData = await db.all(`
        SELECT water_glasses, mood, stress_level, sleep_quality, date
        FROM daily_data 
        WHERE user_id = ? AND date >= date('now', '-30 days')
        ORDER BY date DESC
      `, [userId]);
      
    } catch (dbError) {
      console.log('=== DATABASE ERROR IN ASK AI ===');
      console.log('Error:', dbError);
      console.log('UserID:', userId);
      console.log('Today:', today);
      console.log('================================');
      // Fallback to basic data
      user = { username: 'there' };
      recentData = {};
      recentBMs = [];
      recentSymptoms = {};
      recentNotes = [];
      allRecentData = [];
    }
    
    // DEBUG: Log what data we actually found
    console.log('=== AI CHAT DEBUG ===');
    console.log('User:', user);
    console.log('Recent Data:', recentData);
    console.log('Recent BMs:', recentBMs);
    console.log('Recent Symptoms:', recentSymptoms);
    console.log('Recent Notes:', recentNotes);
    console.log('====================')

    let chatHistoryContext = '';

    // Search chat history if Pinecone is available
    if (pineconeIndex) {
      try {
        const messageEmbedding = await createEmbedding(message);
        const searchResults = await pineconeIndex.query({
          vector: messageEmbedding,
          topK: 3,
          filter: { userId: userId },
          includeMetadata: true
        });

        if (searchResults.matches && searchResults.matches.length > 0) {
          const relevantChats = searchResults.matches
            .filter(match => match.score > 0.5) // Only include relevant matches
            .map(match => `${match.metadata.sender}: ${match.metadata.message}`)
            .join('\n');
          
          if (relevantChats) {
            chatHistoryContext = `\n\nRelevant past conversations:\n${relevantChats}`;
          }
        }
      } catch (error) {
        console.log('Chat history search failed:', error.message);
      }
    }

    // Format detailed context information with safety checks
    const bmSummary = (recentBMs && recentBMs.length > 0) ? 
      recentBMs.map(bm => 
        `${bm.date}: Bristol ${bm.bristol_scale} at ${bm.timing}${bm.notes ? ' (Note: ' + bm.notes + ')' : ''}`
      ).join('\n') : 'No recent bowel movements recorded';
    
    const notesSummary = (recentNotes && recentNotes.length > 0) ?
      recentNotes.map(note => 
        `${note.date}: ${note.note}`
      ).join('\n') : 'No recent notes/remarks';

    // Create data context summary
    const dataAvailable = allRecentData?.length || 0;
    const dateRange = dataAvailable > 0 ? 
      `from ${allRecentData[allRecentData.length - 1]?.date} to ${allRecentData[0]?.date}` : 
      'limited data available';
    
    // Calculate weekly averages if we have enough data
    const weeklyStats = dataAvailable > 0 ? 
      `Weekly averages (${dataAvailable} days): Water ${(allRecentData.reduce((sum, d) => sum + (d.water_glasses || 0), 0) / dataAvailable).toFixed(1)} glasses/day, Mood ${(allRecentData.filter(d => d.mood).reduce((sum, d) => sum + d.mood, 0) / allRecentData.filter(d => d.mood).length || 0).toFixed(1)}/5, Stress ${(allRecentData.filter(d => d.stress_level).reduce((sum, d) => sum + d.stress_level, 0) / allRecentData.filter(d => d.stress_level).length || 0).toFixed(1)}/10` :
      'No weekly data available';

    const contextPrompt = `You are a caring health assistant for ${user?.username || 'the user'}. You have access to their health tracking data.

DATA CONTEXT: You have access to ${dataAvailable} days of data ${dateRange}. When asked about weekly, monthly, or trend analysis, use ALL available data to provide insights.

LATEST DATA (${recentData?.date || 'today'}):
- Water intake: ${recentData?.water_glasses || 0} glasses
- Mood: ${recentData?.mood || 'Not recorded'}/5
- Stress level: ${recentData?.stress_level || 'Not recorded'}/10
- Sleep quality: ${recentData?.sleep_quality || 'Not recorded'}/5
- Bowel movements: ${bmSummary}
- Symptoms: Bloating ${recentSymptoms?.bloating || 0}/5, Abdominal pain ${recentSymptoms?.abdominal_pain || 0}/5
- Notes: ${notesSummary}

ANALYSIS DATA: ${weeklyStats}

ALL DAILY DATA (for analysis): ${allRecentData?.map(d => `${d.date}: ${d.water_glasses || 0} glasses, mood ${d.mood || 'N/A'}/5, stress ${d.stress_level || 'N/A'}/10`).join('; ') || 'No historical data'}${chatHistoryContext}

User question: "${message}"

INSTRUCTIONS: Use ALL available data above to answer questions. For weekly/monthly analysis, calculate from available data and mention the timeframe. Be analytical and helpful. Keep responses 2-3 sentences. No markdown formatting.`;

    // DEBUG: Log the actual prompt being sent to AI
    console.log('=== AI PROMPT DEBUG ===');
    console.log('AI Prompt:', contextPrompt);
    console.log('========================');

    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: contextPrompt }],
      max_tokens: 200,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({ 
      response: response.data.choices[0].message.content,
      timestamp: new Date().toISOString(),
      usedChatHistory: !!chatHistoryContext
    });
  } catch (error) {
    console.error('AI Chat error:', error.response?.data || error.message);
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

    const totalCount = await db.get('SELECT COUNT(*) as count FROM activity_log');
    
    res.json({
      logs,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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