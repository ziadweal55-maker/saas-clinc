const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');

let dbInstance = null;
let SQL = null;
let dbPath = '';

async function getDatabase() {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  
  // Resolve database path: either from config or default local path
  let currentDbPath = '';
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.dbPath && fs.existsSync(config.dbPath)) {
        currentDbPath = config.dbPath;
        console.log('[Database] Using shared network database at:', currentDbPath);
      }
    }
  } catch (e) {
    console.error('[Database] Error reading config.json:', e);
  }

  if (!currentDbPath) {
    const dbFolder = path.join(userDataPath, 'database');
    currentDbPath = path.join(dbFolder, 'clinic.db');
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }
    console.log('[Database] Using local database at:', currentDbPath);
  }

  dbPath = currentDbPath;

  let dbBuffer = null;
  if (fs.existsSync(dbPath)) {
    dbBuffer = fs.readFileSync(dbPath);
  }

  const db = new SQL.Database(dbBuffer);
  
  let saveTimeout = null;
  const saveToDisk = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
      logger.info('Database', 'Persisting database to disk asynchronously (atomic write-swap)...');
      try {
        const data = db.export();
        const buffer = Buffer.from(data);
        const tempPath = dbPath + '.tmp';
        
        // Write to temp file asynchronously
        await fs.promises.writeFile(tempPath, buffer);
        
        // Integrity check: Verify temporary file is non-empty and accessible
        const stat = await fs.promises.stat(tempPath);
        if (stat.size > 0) {
          // Atomic swap
          await fs.promises.rename(tempPath, dbPath);
          logger.info('Database', 'Database successfully persisted.', { sizeBytes: stat.size });
        } else {
          logger.error('Database', 'Database save validation failed: temporary file is empty.', { sizeBytes: stat.size });
        }
      } catch (err) {
        logger.critical('Database', 'Critical error saving database asynchronously:', { error: err.message });
      }
      saveTimeout = null;
    }, 1000); // Debounce for 1 second
  };

  // Ensure save on app exit
  app.on('will-quit', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      try {
        logger.info('Database', 'Persisting database on application quit...');
        const data = db.export();
        const buffer = Buffer.from(data);
        const tempPath = dbPath + '.tmp';
        fs.writeFileSync(tempPath, buffer);
        const stat = fs.statSync(tempPath);
        if (stat.size > 0) {
          fs.renameSync(tempPath, dbPath);
          logger.info('Database', 'Database successfully persisted on quit.', { sizeBytes: stat.size });
        }
      } catch (err) {
        logger.critical('Database', 'Failed to persist database on quit:', { error: err.message });
      }
    }
  });

  // Wrapper to mimic better-sqlite3 API
  dbInstance = {
    prepare: (sql) => {
      return {
        all: (...params) => {
          try {
            const stmt = db.prepare(sql);
            const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            stmt.bind(flattenedParams);
            const results = [];
            while (stmt.step()) results.push(stmt.getAsObject());
            stmt.free();
            return results;
          } catch (err) {
            logger.error('Database', 'DB Prepare All Error', { error: err.message, sql, params });
            console.error('[DB Prepare All Error]', err, sql);
            return [];
          }
        },
        get: (...params) => {
          try {
            const stmt = db.prepare(sql);
            const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            stmt.bind(flattenedParams);
            const result = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return result;
          } catch (err) {
            logger.error('Database', 'DB Prepare Get Error', { error: err.message, sql, params });
            console.error('[DB Prepare Get Error]', err, sql);
            return null;
          }
        },
        run: (...params) => {
          try {
            const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            db.run(sql, flattenedParams);
            saveToDisk();
            
            // Get last insert ID
            const res = db.exec("SELECT last_insert_rowid()");
            const lastId = res[0].values[0][0];
            return { lastInsertRowid: lastId };
          } catch (err) {
            logger.error('Database', 'DB Prepare Run Error', { error: err.message, sql, params });
            console.error('[DB Prepare Run Error]', err, sql);
            return { lastInsertRowid: null, error: err.message };
          }
        }
      };
    },
    exec: (sql) => {
      try {
        db.run(sql);
        saveToDisk();
      } catch (err) {
        console.error('[DB Exec Error]', err, sql);
      }
      return dbInstance;
    },
    pragma: (sql) => {
      try { db.run(`PRAGMA ${sql}`); } catch(e) {}
      return dbInstance;
    }
  };

  // Initialize schema if needed
  initSchema(db, dbInstance);

  // Log Users table schema info for debugging
  try {
    const tableInfo = db.exec("PRAGMA table_info(Users)");
    logger.info('Database', 'Users table schema', { columns: tableInfo[0]?.values });
  } catch (err) {
    logger.error('Database', 'Failed to get Users table info', { error: err.message });
  }

  // Force synchronous write on first creation if file doesn't exist yet
  if (!fs.existsSync(dbPath)) {
    try {
      logger.info('Database', 'Performing initial database write to disk...');
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      logger.info('Database', 'Initial database file created successfully at: ' + dbPath);
    } catch (err) {
      logger.critical('Database', 'Failed to write initial database file:', { error: err.message });
    }
  }

  return dbInstance;
}

function initSchema(rawDb, db) {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'admin',
        doctor_id INTEGER NULL,
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );
    CREATE TABLE IF NOT EXISTS Clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        age INTEGER,
        date_of_birth DATE,
        medical_history TEXT,
        sync_token TEXT,
        pin TEXT,
        is_active INTEGER DEFAULT 1,
        address TEXT,
        referral_source TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS SalaryRecords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        month TEXT,
        base_salary REAL,
        dynamic_salary REAL,
        sessions_count INTEGER,
        total_salary REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES Users(id)
    );
    CREATE TABLE IF NOT EXISTS Doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ClientFiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        file_name TEXT,
        local_file_path TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );
    CREATE TABLE IF NOT EXISTS Appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        doctor_id INTEGER,
        appointment_date DATETIME,
        status TEXT,
        session_type TEXT,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );
    CREATE TABLE IF NOT EXISTS Sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        doctor_id INTEGER,
        appointment_id INTEGER,
        treatment_notes TEXT,
        progress_notes TEXT,
        session_number INTEGER,
        payment_amount REAL,
        payment_method TEXT,
        session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_type TEXT,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id),
        FOREIGN KEY(appointment_id) REFERENCES Appointments(id)
    );
    CREATE TABLE IF NOT EXISTS Assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        doctor_id INTEGER,
        diagnosis TEXT,
        pain_scale INTEGER,
        rom TEXT,
        strength TEXT,
        recommendations TEXT,
        is_completed INTEGER DEFAULT 0,
        assessment_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );
    CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        amount REAL,
        payment_type TEXT,
        package_sessions_total INTEGER NULL,
        package_sessions_used INTEGER NULL,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );
    CREATE TABLE IF NOT EXISTS AuditLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        changed_field TEXT,
        old_value TEXT,
        new_value TEXT,
        admin_username TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );
    CREATE TABLE IF NOT EXISTS Settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    INSERT OR IGNORE INTO Settings (key, value) VALUES ('dashboard_reset_date', '1970-01-01 00:00:00');

    CREATE TABLE IF NOT EXISTS Branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO Branches (id, name) VALUES (1, 'Banha Branch');
    INSERT OR IGNORE INTO Branches (id, name) VALUES (2, 'El Monofaya Branch');

    CREATE TABLE IF NOT EXISTS AssessmentRegions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS AssessmentTests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER,
        name TEXT,
        description TEXT,
        FOREIGN KEY(region_id) REFERENCES AssessmentRegions(id)
    );

    CREATE TABLE IF NOT EXISTS AssessmentResults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        test_id INTEGER,
        result TEXT, -- 'Positive' or 'Negative'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(test_id) REFERENCES AssessmentTests(id)
    );

    CREATE TABLE IF NOT EXISTS ExerciseRegions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER,
        name TEXT UNIQUE,
        category TEXT, -- Legacy, to be migrated to region_id
        type TEXT, -- 'Strengthening', 'Stretching', etc.
        instructions TEXT,
        video_url TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(region_id) REFERENCES ExerciseRegions(id)
    );

    CREATE TABLE IF NOT EXISTS ClientExercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        exercise_id INTEGER,
        doctor_id INTEGER,
        sets TEXT,
        reps TEXT,
        frequency TEXT,
        notes TEXT,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(exercise_id) REFERENCES Exercises(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS ExerciseSessionLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_exercise_id INTEGER,
        session_id INTEGER,
        sets_completed TEXT,
        reps_completed TEXT,
        notes TEXT,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_exercise_id) REFERENCES ClientExercises(id),
        FOREIGN KEY(session_id) REFERENCES Sessions(id)
    );

    CREATE TABLE IF NOT EXISTS Loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        month TEXT NOT NULL,
        is_settled INTEGER DEFAULT 0,
        settled_at DATETIME,
        loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS WasteItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        waste_date TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ClientProfiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        profile_type TEXT NOT NULL,
        name TEXT,
        height REAL NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );

    CREATE TABLE IF NOT EXISTS PTRedFlags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        flags TEXT,
        other_text TEXT,
        doctor_id INTEGER NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS PTSubjective (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        chief_complaint TEXT,
        aggravating TEXT,
        easing TEXT,
        irritability TEXT,
        irritability_notes TEXT,
        nature TEXT,
        nature_notes TEXT,
        doctor_id INTEGER NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS PTObjectiveRows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        subjective_id INTEGER NULL,
        row_type TEXT NOT NULL,
        joint_name TEXT,
        pain INTEGER DEFAULT 0,
        limitation INTEGER DEFAULT 0,
        angle TEXT,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(subjective_id) REFERENCES PTSubjective(id)
    );

    CREATE TABLE IF NOT EXISTS PTObjectivePalpation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        subjective_id INTEGER NULL,
        notes TEXT,
        doctor_id INTEGER NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(subjective_id) REFERENCES PTSubjective(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS PTSessionPlan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        electrotherapy TEXT,
        manual_therapy TEXT,
        tools TEXT,
        doctor_id INTEGER NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS NutritionMedicalHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        content TEXT,
        height REAL,
        weight REAL,
        doctor_id INTEGER NULL,
        session_date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS InvestigationLibrary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ClientInvestigations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        investigation_id INTEGER NOT NULL,
        result_text TEXT,
        result_date DATE,
        doctor_id INTEGER NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(investigation_id) REFERENCES InvestigationLibrary(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS InbodyUploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        file_name TEXT,
        local_file_path TEXT,
        session_date DATE DEFAULT CURRENT_DATE,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id)
    );

    CREATE TABLE IF NOT EXISTS LymphaticMeasurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        measurement_name TEXT NOT NULL,
        value TEXT,
        unit TEXT DEFAULT 'cm',
        session_date DATE DEFAULT CURRENT_DATE,
        doctor_id INTEGER NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id),
        FOREIGN KEY(doctor_id) REFERENCES Doctors(id)
    );

    CREATE TABLE IF NOT EXISTS SessionTypes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        num_sessions INTEGER NULL,
        is_active INTEGER DEFAULT 1,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ClientExercisesHome (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        profile_id INTEGER,
        exercise_id INTEGER,
        doctor_id INTEGER,
        sets TEXT,
        reps TEXT,
        frequency TEXT,
        notes TEXT,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES Clients(id),
        FOREIGN KEY(exercise_id) REFERENCES Exercises(id)
    );

    CREATE TABLE IF NOT EXISTS AttendanceLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        log_date DATE NOT NULL,
        check_in_time TEXT,
        check_out_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES Users(id),
        UNIQUE(user_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS SyncQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        payload TEXT,
        attempts INTEGER DEFAULT 0,
        last_attempt DATETIME,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON Sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_doctor_id ON Sessions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON Appointments(client_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON Appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_client_id ON Assessments(client_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_doctor_id ON Assessments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_payments_client_id ON Payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_profiles_client_id ON ClientProfiles(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_exercises_client_id ON ClientExercises(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_exercises_home_client_id ON ClientExercisesHome(client_id);
    CREATE INDEX IF NOT EXISTS idx_pt_subjective_profile_id ON PTSubjective(profile_id);
    CREATE INDEX IF NOT EXISTS idx_pt_objective_rows_profile_id ON PTObjectiveRows(profile_id);
    CREATE INDEX IF NOT EXISTS idx_pt_objective_rows_subjective_id ON PTObjectiveRows(subjective_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_client_id ON SyncQueue(client_id);
  `);

  // Seed Assessment Regions and Tests if empty
  const regionsCount = db.prepare("SELECT COUNT(*) as count FROM AssessmentRegions").get().count;
  if (regionsCount === 0) {
    const data = [
      { region: 'Shoulder', tests: ['Hawkins-Kennedy Test', 'Neer Test', 'Empty Can Test'] },
      { region: 'Arm (Biceps/Triceps)', tests: ["Speed's Test", "Yergason's Test"] },
      { region: 'Upper Back', tests: ["Spurling's Test"] },
      { region: 'Mid Back', tests: ['Slump Test'] },
      { region: 'Lower Back', tests: ['Straight Leg Raise', 'Faber Test'] },
      { region: 'Leg: Anterior Thigh', tests: ['Thomas Test'] },
      { region: 'Leg: Posterior Thigh', tests: ['Popliteal Angle Test'] },
      { region: 'Leg: Knee', tests: ['Lachman Test', 'McMurray Test', 'Valgus Stress Test'] },
      { region: 'Leg: Calf', tests: ['Thompson Test', 'Homan\'s Sign'] }
    ];

    data.forEach((item, rIdx) => {
      const res = db.prepare("INSERT INTO AssessmentRegions (name, sort_order) VALUES (?, ?)").run(item.region, rIdx);
      const regionId = res.lastInsertRowid;
      item.tests.forEach(testName => {
        db.prepare("INSERT INTO AssessmentTests (region_id, name) VALUES (?, ?)").run(regionId, testName);
      });
    });
  }

  // Seed Initial Exercise Regions if empty
  const exerciseRegionsCount = db.prepare("SELECT COUNT(*) as count FROM ExerciseRegions").get().count;
  if (exerciseRegionsCount === 0) {
    const defaultRegions = ['Shoulder', 'Lower Back', 'Mid Back', 'Knee', 'Leg: Calf', 'Hip', 'Ankle', 'Cervical Spine'];
    defaultRegions.forEach((name, idx) => {
      db.prepare("INSERT INTO ExerciseRegions (name, sort_order) VALUES (?, ?)").run(name, idx);
    });
  }

  // Seed Initial Exercise Library if empty
  const exercisesCount = db.prepare("SELECT COUNT(*) as count FROM Exercises").get().count;
  if (exercisesCount === 0) {
    const defaultExercises = [
      { name: 'Isometric Quad Contraction', category: 'Knee', type: 'Strengthening', instructions: 'Sit with leg straight. Tighten thigh muscle, pushing knee down into bed. Hold 5-10 seconds.' },
      { name: 'Glute Bridge', category: 'Lower Back', type: 'Strengthening', instructions: 'Lie on back with knees bent. Lift hips toward ceiling, squeezing glutes. Hold 3 seconds.' },
      { name: 'Wall Slides', category: 'Shoulder', type: 'Mobility', instructions: 'Stand with back against wall. Slide arms up and down wall in a "W" to "Y" motion.' },
      { name: 'Cat-Cow Stretch', category: 'Mid Back', type: 'Stretching', instructions: 'On all fours, arch back up like a cat, then drop belly down, looking up.' },
      { name: 'Calf Stretch (Wall)', category: 'Leg: Calf', type: 'Stretching', instructions: 'Stand facing wall. One foot forward, one back. Keep back heel down and lean forward.' }
    ];

    defaultExercises.forEach(ex => {
      // Find region id by category name
      const region = db.prepare("SELECT id FROM ExerciseRegions WHERE name = ?").get(ex.category);
      db.prepare("INSERT INTO Exercises (region_id, name, type, instructions) VALUES (?, ?, ?, ?)").run(
        region ? region.id : null, ex.name, ex.type, ex.instructions
      );
    });
  }

  // Link existing exercises to regions based on category name (Migration)
  const unlinkedExercises = db.prepare("SELECT * FROM Exercises WHERE region_id IS NULL AND category IS NOT NULL").all();
  unlinkedExercises.forEach(ex => {
    const region = db.prepare("SELECT id FROM ExerciseRegions WHERE name = ?").get(ex.category);
    if (region) {
      db.prepare("UPDATE Exercises SET region_id = ? WHERE id = ?").run(region.id, ex.id);
    } else {
      // Create new region if it doesn't exist
      const res = db.prepare("INSERT INTO ExerciseRegions (name) VALUES (?)").run(ex.category);
      db.prepare("UPDATE Exercises SET region_id = ? WHERE id = ?").run(res.lastInsertRowid, ex.id);
    }
  });

  // Migration for new columns
  const migrations = [
    "ALTER TABLE Clients ADD COLUMN sync_token TEXT",
    "ALTER TABLE Clients ADD COLUMN pin TEXT",
    "ALTER TABLE Clients ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE Clients ADD COLUMN age INTEGER",
    "ALTER TABLE Appointments ADD COLUMN doctor_id INTEGER",
    "ALTER TABLE Sessions ADD COLUMN doctor_id INTEGER",
    "ALTER TABLE Sessions ADD COLUMN session_number INTEGER",
    "ALTER TABLE Sessions ADD COLUMN payment_amount REAL",
    "ALTER TABLE Sessions ADD COLUMN payment_method TEXT",
    "ALTER TABLE ClientExercises ADD COLUMN doctor_id INTEGER",
    "ALTER TABLE ClientExercises ADD COLUMN updated_at DATETIME",
    "ALTER TABLE Users ADD COLUMN role TEXT DEFAULT 'admin'",
    "ALTER TABLE Users ADD COLUMN doctor_id INTEGER",
    "ALTER TABLE Users ADD COLUMN status TEXT DEFAULT 'active'",
    "ALTER TABLE Users ADD COLUMN base_salary REAL DEFAULT 0",
    // Loans & WasteItems migration (for existing databases)
    "CREATE TABLE IF NOT EXISTS Loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount REAL NOT NULL, note TEXT, month TEXT NOT NULL, is_settled INTEGER DEFAULT 0, settled_at DATETIME, loan_date DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES Users(id))",
    "CREATE TABLE IF NOT EXISTS WasteItems (id INTEGER PRIMARY KEY AUTOINCREMENT, waste_date TEXT NOT NULL, item_name TEXT NOT NULL, quantity REAL NOT NULL, unit_cost REAL NOT NULL, total_cost REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    // New profile system
    "CREATE TABLE IF NOT EXISTS ClientProfiles (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, profile_type TEXT NOT NULL, name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES Clients(id))",
    "CREATE TABLE IF NOT EXISTS PTRedFlags (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, flags TEXT, other_text TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS PTSubjective (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, chief_complaint TEXT, aggravating TEXT, easing TEXT, irritability TEXT, irritability_notes TEXT, nature TEXT, nature_notes TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS PTObjectiveRows (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, row_type TEXT NOT NULL, joint_name TEXT, pain INTEGER DEFAULT 0, limitation INTEGER DEFAULT 0, angle TEXT, sort_order INTEGER DEFAULT 0, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS PTObjectivePalpation (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, notes TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS PTSessionPlan (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, electrotherapy TEXT, manual_therapy TEXT, tools TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS NutritionMedicalHistory (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, content TEXT, session_date DATE DEFAULT CURRENT_DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS InvestigationLibrary (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS ClientInvestigations (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, investigation_id INTEGER NOT NULL, result_text TEXT, result_date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id), FOREIGN KEY(investigation_id) REFERENCES InvestigationLibrary(id))",
    "CREATE TABLE IF NOT EXISTS InbodyUploads (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, file_name TEXT, local_file_path TEXT, session_date DATE DEFAULT CURRENT_DATE, upload_date DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS LymphaticMeasurements (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, measurement_name TEXT NOT NULL, value TEXT, unit TEXT DEFAULT 'cm', session_date DATE DEFAULT CURRENT_DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(profile_id) REFERENCES ClientProfiles(id))",
    "CREATE TABLE IF NOT EXISTS SessionTypes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cost REAL NOT NULL DEFAULT 0, num_sessions INTEGER NULL, is_active INTEGER DEFAULT 1, branch_id INTEGER DEFAULT 1 REFERENCES Branches(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS ClientExercisesHome (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, profile_id INTEGER, exercise_id INTEGER, doctor_id INTEGER, sets TEXT, reps TEXT, frequency TEXT, notes TEXT, assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES Clients(id), FOREIGN KEY(exercise_id) REFERENCES Exercises(id))",
    // Migrations for existing tables
    "ALTER TABLE Appointments ADD COLUMN completed_by_staff_id INTEGER NULL",
    "ALTER TABLE Sessions ADD COLUMN session_type_id INTEGER NULL",
    "ALTER TABLE Payments ADD COLUMN session_type_id INTEGER NULL",
    "ALTER TABLE ClientFiles ADD COLUMN profile_id INTEGER NULL",
    "ALTER TABLE ClientExercises ADD COLUMN profile_id INTEGER NULL",
    "ALTER TABLE ClientExercises ADD COLUMN exercise_type TEXT DEFAULT 'clinical'",
    "ALTER TABLE NutritionMedicalHistory ADD COLUMN height REAL NULL",
    "ALTER TABLE NutritionMedicalHistory ADD COLUMN weight REAL NULL",
    "CREATE TABLE IF NOT EXISTS AttendanceLogs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date DATE NOT NULL, check_in_time TEXT, check_out_time TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES Users(id), UNIQUE(user_id, log_date))",
    "ALTER TABLE PTRedFlags ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE PTSubjective ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE PTObjectivePalpation ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE PTSessionPlan ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE NutritionMedicalHistory ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE ClientInvestigations ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE LymphaticMeasurements ADD COLUMN doctor_id INTEGER NULL",
    "ALTER TABLE ClientProfiles ADD COLUMN height REAL NULL",
    "ALTER TABLE PTObjectiveRows ADD COLUMN subjective_id INTEGER NULL",
    "ALTER TABLE PTObjectivePalpation ADD COLUMN subjective_id INTEGER NULL",
    "UPDATE PTObjectiveRows SET subjective_id = (SELECT id FROM PTSubjective WHERE PTSubjective.profile_id = PTObjectiveRows.profile_id) WHERE subjective_id IS NULL",
    "UPDATE PTObjectivePalpation SET subjective_id = (SELECT id FROM PTSubjective WHERE PTSubjective.profile_id = PTObjectivePalpation.profile_id) WHERE subjective_id IS NULL",
    "ALTER TABLE Clients ADD COLUMN address TEXT",
    "ALTER TABLE Clients ADD COLUMN referral_source TEXT",
    "ALTER TABLE Appointments ADD COLUMN session_type TEXT",
    "ALTER TABLE Sessions ADD COLUMN session_type TEXT",
    // Branch isolation migrations — all existing data stamped as Branch 1
    "ALTER TABLE Clients ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Users ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Doctors ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Sessions ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Appointments ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Payments ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Assessments ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE SalaryRecords ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE Loans ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE WasteItems ADD COLUMN branch_id INTEGER DEFAULT 1",
    "ALTER TABLE AttendanceLogs ADD COLUMN branch_id INTEGER DEFAULT 1",
    "UPDATE Clients SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Users SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Doctors SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Sessions SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Appointments SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Payments SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Assessments SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE SalaryRecords SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE Loans SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE WasteItems SET branch_id = 1 WHERE branch_id IS NULL",
    "UPDATE AttendanceLogs SET branch_id = 1 WHERE branch_id IS NULL",
    "ALTER TABLE SessionTypes ADD COLUMN branch_id INTEGER DEFAULT 1",
    "UPDATE SessionTypes SET branch_id = 1 WHERE branch_id IS NULL",
    "ALTER TABLE PTSubjective ADD COLUMN pain_scale TEXT DEFAULT NULL",
    "ALTER TABLE Payments ADD COLUMN notes TEXT DEFAULT NULL",
    "ALTER TABLE Users ADD COLUMN created_at DATETIME"
  ];

  migrations.forEach(m => {
    try { rawDb.run(m); } catch (e) { /* Column likely already exists */ }
  });
}

async function reloadDatabase() {
  dbInstance = null;
  // We don't need to nullify SQL (initSqlJs) as that's just the engine
  return await getDatabase();
}

module.exports = { getDatabase, reloadDatabase };
