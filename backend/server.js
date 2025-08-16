require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'your-production-domain.com' : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files
app.use(express.static('../public'));

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

    // Create user
    const result = await db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );

    // Generate token
    const token = jwt.sign(
      { userId: result.id, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.id, username, email }
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
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes
app.use('/api/data', authenticateToken);
app.use('/api/analytics', authenticateToken);

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

    res.json({
      historicalData,
      bristolDistribution: bristolData
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  process.exit(0);
});