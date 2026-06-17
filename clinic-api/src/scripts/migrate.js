const { pool } = require('../config/db');

/**
 * Creates the global schema and metadata tables in the public schema
 */
async function createGlobalSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Tenants metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id VARCHAR(50) PRIMARY KEY, -- Subdomain e.g. "revive"
        name VARCHAR(100) NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(10) DEFAULT '#C8102E',
        whatsapp_number VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) NOT NULL, -- starter, pro, etc.
        status VARCHAR(20) NOT NULL, -- active, unpaid, cancelled
        current_period_start TIMESTAMPTZ NOT NULL,
        current_period_end TIMESTAMPTZ NOT NULL,
        paymob_order_id VARCHAR(100),
        paymob_card_token TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns to public.tenants (idempotent)
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email VARCHAR(150)`);
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"calendar":true,"patients":true,"reports":true,"finance":true,"assessments":true,"exercises":true,"investigations":true,"ai_assistant":true,"attendance":true,"branches":true,"users":true}'`);
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await client.query(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`);

    // Add new columns to public.subscriptions (idempotent)
    await client.query(`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_extended_by INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS notes TEXT`);

    // Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price_monthly NUMERIC(10,2) DEFAULT 0,
        max_users INTEGER,
        max_branches INTEGER,
        max_storage_mb INTEGER,
        max_patients INTEGER,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO public.plans (id, name, price_monthly, max_users, max_branches, max_storage_mb, max_patients, description) VALUES
      ('starter', 'Starter', 0, 5, 1, 500, 200, 'Perfect for small clinics getting started'),
      ('pro', 'Pro', 299, 20, 3, 2000, 1000, 'For growing clinics with multiple staff'),
      ('enterprise', 'Enterprise', 799, NULL, NULL, NULL, NULL, 'Unlimited scale for large clinic networks')
      ON CONFLICT DO NOTHING;
    `);

    // Tenant status history
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_status_history (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) REFERENCES public.tenants(id) ON DELETE CASCADE,
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        changed_by VARCHAR(100),
        reason TEXT,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Admin audit logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_email VARCHAR(150),
        action VARCHAR(100),
        target_tenant_id VARCHAR(50),
        metadata JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Announcements
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(30) DEFAULT 'info',
        target VARCHAR(50) DEFAULT 'all',
        is_active BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );
    `);

    // Payment history
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.payment_history (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(50) REFERENCES public.tenants(id) ON DELETE CASCADE,
        amount NUMERIC(10,2),
        currency VARCHAR(10) DEFAULT 'EGP',
        status VARCHAR(30),
        paymob_order_id VARCHAR(100),
        billing_period_start TIMESTAMPTZ,
        billing_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Super admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) UNIQUE NOT NULL,
        name VARCHAR(100),
        password_hash TEXT,
        supabase_uid VARCHAR(100) UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure password_hash column exists on admins (idempotent)
    await client.query(`ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash TEXT`);

    // Seed default super admin (password: 'password' — bcrypt hash)
    await client.query(`
      INSERT INTO public.admins (email, name, password_hash, is_active)
      VALUES ('admin@saasclinic.com', 'Super Admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true)
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[MIGRATION] Global schema initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION] Error creating global schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Provisions a specific tenant's schema and all tables
 */
async function createTenantSchema(tenantId) {
  const schemaName = `tenant_${tenantId.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`[MIGRATION] Creating schema: ${schemaName}`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Set search_path temporarily to this schema to create tables inside it
    await client.query(`SET search_path TO ${schemaName}`);

    // 1. Branches
    await client.query(`
      CREATE TABLE IF NOT EXISTS Branches (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed default branches if table is new and empty
    await client.query(`
      INSERT INTO Branches (id, name) VALUES (1, 'Main Branch')
      ON CONFLICT DO NOTHING;
    `);

    // 2. Doctors
    await client.query(`
      CREATE TABLE IF NOT EXISTS Doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT,
        status TEXT DEFAULT 'active',
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'admin',
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        status TEXT DEFAULT 'active',
        base_salary NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Clients
    await client.query(`
      CREATE TABLE IF NOT EXISTS Clients (
        id SERIAL PRIMARY KEY,
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
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Appointments
    await client.query(`
      CREATE TABLE IF NOT EXISTS Appointments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES Doctors(id) ON DELETE SET NULL,
        appointment_date TIMESTAMPTZ,
        status TEXT,
        session_type TEXT,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        completed_by_staff_id INTEGER NULL REFERENCES Users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS Sessions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES Doctors(id) ON DELETE SET NULL,
        appointment_id INTEGER REFERENCES Appointments(id) ON DELETE SET NULL,
        treatment_notes TEXT,
        progress_notes TEXT,
        session_number INTEGER,
        payment_amount NUMERIC(10,2),
        payment_method TEXT,
        session_date TIMESTAMPTZ DEFAULT NOW(),
        session_type TEXT,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        session_type_id INTEGER NULL
      );
    `);

    // 7. Assessments
    await client.query(`
      CREATE TABLE IF NOT EXISTS Assessments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES Doctors(id) ON DELETE SET NULL,
        diagnosis TEXT,
        pain_scale INTEGER,
        rom TEXT,
        strength TEXT,
        recommendations TEXT,
        is_completed INTEGER DEFAULT 0,
        assessment_date DATE DEFAULT CURRENT_DATE,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS Payments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        amount NUMERIC(10,2),
        payment_type TEXT,
        package_sessions_total INTEGER NULL,
        package_sessions_used INTEGER NULL,
        payment_date TIMESTAMPTZ DEFAULT NOW(),
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        session_type_id INTEGER NULL,
        notes TEXT
      );
    `);

    // 9. AuditLogs
    await client.query(`
      CREATE TABLE IF NOT EXISTS AuditLogs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        changed_field TEXT,
        old_value TEXT,
        new_value TEXT,
        admin_username TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 10. Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS Settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    await client.query(`
      INSERT INTO Settings (key, value) VALUES ('dashboard_reset_date', '1970-01-01 00:00:00')
      ON CONFLICT DO NOTHING;
    `);

    // 11. AssessmentRegions & Tests
    await client.query(`
      CREATE TABLE IF NOT EXISTS AssessmentRegions (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        sort_order INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS AssessmentTests (
        id SERIAL PRIMARY KEY,
        region_id INTEGER REFERENCES AssessmentRegions(id) ON DELETE CASCADE,
        name TEXT,
        description TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS AssessmentResults (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        test_id INTEGER REFERENCES AssessmentTests(id) ON DELETE CASCADE,
        result TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 12. ExerciseRegions, Exercises & assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS ExerciseRegions (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        sort_order INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Exercises (
        id SERIAL PRIMARY KEY,
        region_id INTEGER REFERENCES ExerciseRegions(id) ON DELETE SET NULL,
        name TEXT UNIQUE,
        category TEXT,
        type TEXT,
        instructions TEXT,
        video_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ClientExercises (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES Exercises(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES Doctors(id) ON DELETE SET NULL,
        profile_id INTEGER,
        exercise_type TEXT DEFAULT 'clinical',
        sets TEXT,
        reps TEXT,
        frequency TEXT,
        notes TEXT,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ExerciseSessionLogs (
        id SERIAL PRIMARY KEY,
        client_exercise_id INTEGER REFERENCES ClientExercises(id) ON DELETE CASCADE,
        session_id INTEGER REFERENCES Sessions(id) ON DELETE CASCADE,
        sets_completed TEXT,
        reps_completed TEXT,
        notes TEXT,
        logged_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 13. Financial: Loans & WasteItems
    await client.query(`
      CREATE TABLE IF NOT EXISTS Loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        month TEXT NOT NULL,
        is_settled INTEGER DEFAULT 0,
        settled_at TIMESTAMPTZ,
        loan_date TIMESTAMPTZ DEFAULT NOW(),
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS WasteItems (
        id SERIAL PRIMARY KEY,
        waste_date TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost NUMERIC(10,2) NOT NULL,
        total_cost NUMERIC(10,2) NOT NULL,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 14. ClientProfiles & detailed clinical systems
    await client.query(`
      CREATE TABLE IF NOT EXISTS ClientProfiles (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES Clients(id) ON DELETE CASCADE,
        profile_type TEXT NOT NULL,
        name TEXT,
        height REAL NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS PTRedFlags (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        flags TEXT,
        other_text TEXT,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS PTSubjective (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        chief_complaint TEXT,
        aggravating TEXT,
        easing TEXT,
        irritability TEXT,
        irritability_notes TEXT,
        nature TEXT,
        nature_notes TEXT,
        pain_scale TEXT DEFAULT NULL,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS PTObjectiveRows (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        subjective_id INTEGER NULL REFERENCES PTSubjective(id) ON DELETE CASCADE,
        row_type TEXT NOT NULL,
        joint_name TEXT,
        pain INTEGER DEFAULT 0,
        limitation INTEGER DEFAULT 0,
        angle TEXT,
        sort_order INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS PTObjectivePalpation (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        subjective_id INTEGER NULL REFERENCES PTSubjective(id) ON DELETE CASCADE,
        notes TEXT,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS PTSessionPlan (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        electrotherapy TEXT,
        manual_therapy TEXT,
        tools TEXT,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 15. Nutrition Medical History
    await client.query(`
      CREATE TABLE IF NOT EXISTS NutritionMedicalHistory (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        content TEXT,
        height REAL NULL,
        weight REAL NULL,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        session_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 16. Investigations & uploads
    await client.query(`
      CREATE TABLE IF NOT EXISTS InvestigationLibrary (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ClientInvestigations (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        investigation_id INTEGER NOT NULL REFERENCES InvestigationLibrary(id) ON DELETE CASCADE,
        result_text TEXT,
        result_date DATE,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS InbodyUploads (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        file_name TEXT,
        local_file_path TEXT,
        session_date DATE DEFAULT CURRENT_DATE,
        upload_date TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS LymphaticMeasurements (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        measurement_name TEXT NOT NULL,
        value TEXT,
        unit TEXT DEFAULT 'cm',
        session_date DATE DEFAULT CURRENT_DATE,
        doctor_id INTEGER NULL REFERENCES Doctors(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 17. SessionTypes, HomeExercises & Attendance logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS SessionTypes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cost NUMERIC(10,2) NOT NULL DEFAULT 0,
        num_sessions INTEGER NULL,
        is_active INTEGER DEFAULT 1,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ClientExercisesHome (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES Clients(id) ON DELETE CASCADE,
        profile_id INTEGER REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES Exercises(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES Doctors(id) ON DELETE SET NULL,
        sets TEXT,
        reps TEXT,
        frequency TEXT,
        notes TEXT,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS AttendanceLogs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        check_in_time TEXT,
        check_out_time TEXT,
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, log_date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ClientFiles (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES Clients(id) ON DELETE CASCADE,
        profile_id INTEGER NULL REFERENCES ClientProfiles(id) ON DELETE CASCADE,
        file_name TEXT,
        local_file_path TEXT,
        upload_date TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS SalaryRecords (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES Users(id) ON DELETE CASCADE,
        month TEXT,
        base_salary NUMERIC(10,2),
        dynamic_salary NUMERIC(10,2),
        sessions_count INTEGER,
        total_salary NUMERIC(10,2),
        branch_id INTEGER DEFAULT 1 REFERENCES Branches(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed defaults for AssessmentRegions & AssessmentTests inside this schema
    await client.query(`
      INSERT INTO AssessmentRegions (id, name, sort_order) VALUES
      (1, 'Shoulder', 0),
      (2, 'Arm (Biceps/Triceps)', 1),
      (3, 'Upper Back', 2),
      (4, 'Mid Back', 3),
      (5, 'Lower Back', 4),
      (6, 'Leg: Anterior Thigh', 5),
      (7, 'Leg: Posterior Thigh', 6),
      (8, 'Leg: Knee', 7),
      (9, 'Leg: Calf', 8)
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO AssessmentTests (region_id, name) VALUES
      (1, 'Hawkins-Kennedy Test'), (1, 'Neer Test'), (1, 'Empty Can Test'),
      (2, 'Speed''s Test'), (2, 'Yergason''s Test'),
      (3, 'Spurling''s Test'),
      (4, 'Slump Test'),
      (5, 'Straight Leg Raise'), (5, 'Faber Test'),
      (6, 'Thomas Test'),
      (7, 'Popliteal Angle Test'),
      (8, 'Lachman Test'), (8, 'McMurray Test'), (8, 'Valgus Stress Test'),
      (9, 'Thompson Test'), (9, 'Homan''s Sign')
      ON CONFLICT DO NOTHING;
    `);

    // Seed default exercise regions & initial exercise library
    await client.query(`
      INSERT INTO ExerciseRegions (id, name, sort_order) VALUES
      (1, 'Shoulder', 0),
      (2, 'Lower Back', 1),
      (3, 'Mid Back', 2),
      (4, 'Knee', 3),
      (5, 'Leg: Calf', 4),
      (6, 'Hip', 5),
      (7, 'Ankle', 6),
      (8, 'Cervical Spine', 7)
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO Exercises (region_id, name, type, instructions) VALUES
      (4, 'Isometric Quad Contraction', 'Strengthening', 'Sit with leg straight. Tighten thigh muscle, pushing knee down into bed. Hold 5-10 seconds.'),
      (2, 'Glute Bridge', 'Strengthening', 'Lie on back with knees bent. Lift hips toward ceiling, squeezing glutes. Hold 3 seconds.'),
      (1, 'Wall Slides', 'Mobility', 'Stand with back against wall. Slide arms up and down wall in a "W" to "Y" motion.'),
      (3, 'Cat-Cow Stretch', 'Stretching', 'On all fours, arch back up like a cat, then drop belly down, looking up.'),
      (5, 'Calf Stretch (Wall)', 'Stretching', 'Stand facing wall. One foot forward, one back. Keep back heel down and lean forward.')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log(`[MIGRATION] Tenant schema ${schemaName} created and tables initialized successfully`);
    return schemaName;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[MIGRATION] Error creating schema ${schemaName}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createGlobalSchema,
  createTenantSchema
};
