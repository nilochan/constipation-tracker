const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path - will use Railway volume when DB_PATH is set
const dbPath = process.env.DB_PATH || './database.db';

class Database {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory:', dataDir);
    }
    
    console.log('🗄️ Database configuration:');
    console.log('- DB_PATH env var:', process.env.DB_PATH);
    console.log('- Final dbPath:', dbPath);
    console.log('- Data directory:', dataDir);
    console.log('- Directory exists:', fs.existsSync(dataDir));
    console.log('- Database file exists:', fs.existsSync(dbPath));
    
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log('- Database file size:', stats.size, 'bytes');
      console.log('- Database created:', stats.birthtime);
      console.log('- Database modified:', stats.mtime);
    }
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        console.error('Attempted path:', dbPath);
      } else {
        console.log('✅ Connected to SQLite database at:', dbPath);
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    console.log('🔧 Initializing database tables...');
    
    // Check if users table already has data
    this.db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (!err) {
        if (row.count > 0) {
          console.log('📋 Users table already exists');
          this.db.get("SELECT COUNT(*) as count FROM users", (err, userRow) => {
            if (!err) {
              console.log('👤 Existing users in database:', userRow.count);
            }
          });
        } else {
          console.log('🆕 Creating new users table');
        }
      }
    });
    
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        profile_photo TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily data table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        water_glasses INTEGER DEFAULT 0,
        mood INTEGER,
        stress_level INTEGER,
        sleep_quality INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, date)
      )
    `);

    // Bowel movements table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS bowel_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        bristol_type INTEGER NOT NULL,
        urgency INTEGER NOT NULL,
        straining BOOLEAN NOT NULL,
        satisfaction INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Meals table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        food_items TEXT NOT NULL,
        portion TEXT NOT NULL,
        trigger_foods TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Checklist items table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        item_index INTEGER NOT NULL,
        checked BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, date, category, item_index)
      )
    `);

    // Symptoms table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS symptoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        bloating INTEGER DEFAULT 0,
        abdominal_pain INTEGER DEFAULT 0,
        nausea INTEGER DEFAULT 0,
        fatigue INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, date)
      )
    `);

    // Daily notes table (separate from daily_data to allow multiple entries per day)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Activity log table for admin monitoring
    this.db.run(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log('Database tables initialized');
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();