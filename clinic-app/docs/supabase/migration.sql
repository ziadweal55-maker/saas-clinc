-- ==========================================
-- SUPABASE MIGRATION SCRIPT FOR NEW CLINIC FEATURES
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create client_profiles table
CREATE TABLE IF NOT EXISTS client_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    profile_type TEXT NOT NULL, -- 'physical_therapy', 'nutrition', 'lymphatic'
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read client_profiles" ON client_profiles;
CREATE POLICY "Allow public read client_profiles" ON client_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert client_profiles" ON client_profiles;
CREATE POLICY "Allow public upsert client_profiles" ON client_profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. Create pt_red_flags table
CREATE TABLE IF NOT EXISTS pt_red_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    flags JSONB DEFAULT '[]'::jsonb,
    other_text TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pt_red_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read pt_red_flags" ON pt_red_flags;
CREATE POLICY "Allow public read pt_red_flags" ON pt_red_flags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert pt_red_flags" ON pt_red_flags;
CREATE POLICY "Allow public upsert pt_red_flags" ON pt_red_flags FOR ALL USING (true) WITH CHECK (true);

-- 3. Create pt_subjective table
CREATE TABLE IF NOT EXISTS pt_subjective (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    chief_complaint TEXT,
    aggravating TEXT,
    easing TEXT,
    irritability TEXT, -- 'high', 'mod', 'low'
    irritability_notes TEXT,
    nature TEXT, -- 'inflammatory', 'mechanical', 'neural'
    nature_notes TEXT,
    doctor_id INT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pt_subjective ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read pt_subjective" ON pt_subjective;
CREATE POLICY "Allow public read pt_subjective" ON pt_subjective FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert pt_subjective" ON pt_subjective;
CREATE POLICY "Allow public upsert pt_subjective" ON pt_subjective FOR ALL USING (true) WITH CHECK (true);

-- 4. Create pt_objective_rows table
CREATE TABLE IF NOT EXISTS pt_objective_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    subjective_local_id TEXT REFERENCES pt_subjective(local_id) ON DELETE CASCADE,
    row_type TEXT NOT NULL, -- 'AROM', 'PROM'
    joint_name TEXT NOT NULL,
    pain BOOLEAN DEFAULT FALSE,
    limitation BOOLEAN DEFAULT FALSE,
    angle TEXT,
    sort_order INT DEFAULT 0
);

ALTER TABLE pt_objective_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read pt_objective_rows" ON pt_objective_rows;
CREATE POLICY "Allow public read pt_objective_rows" ON pt_objective_rows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert pt_objective_rows" ON pt_objective_rows;
CREATE POLICY "Allow public upsert pt_objective_rows" ON pt_objective_rows FOR ALL USING (true) WITH CHECK (true);

-- 5. Create pt_objective_palpation table
CREATE TABLE IF NOT EXISTS pt_objective_palpation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    subjective_local_id TEXT REFERENCES pt_subjective(local_id) ON DELETE CASCADE,
    notes TEXT,
    doctor_id INT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pt_objective_palpation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read pt_objective_palpation" ON pt_objective_palpation;
CREATE POLICY "Allow public read pt_objective_palpation" ON pt_objective_palpation FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert pt_objective_palpation" ON pt_objective_palpation;
CREATE POLICY "Allow public upsert pt_objective_palpation" ON pt_objective_palpation FOR ALL USING (true) WITH CHECK (true);

-- 6. Create pt_session_plan table
CREATE TABLE IF NOT EXISTS pt_session_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    electrotherapy JSONB DEFAULT '{}'::jsonb,
    manual_therapy JSONB DEFAULT '{}'::jsonb,
    tools JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pt_session_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read pt_session_plan" ON pt_session_plan;
CREATE POLICY "Allow public read pt_session_plan" ON pt_session_plan FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert pt_session_plan" ON pt_session_plan;
CREATE POLICY "Allow public upsert pt_session_plan" ON pt_session_plan FOR ALL USING (true) WITH CHECK (true);

-- 7. Create nutrition_medical_history table
CREATE TABLE IF NOT EXISTS nutrition_medical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_medical_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read nutrition_medical_history" ON nutrition_medical_history;
CREATE POLICY "Allow public read nutrition_medical_history" ON nutrition_medical_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert nutrition_medical_history" ON nutrition_medical_history;
CREATE POLICY "Allow public upsert nutrition_medical_history" ON nutrition_medical_history FOR ALL USING (true) WITH CHECK (true);

-- 8. Create client_investigations table
CREATE TABLE IF NOT EXISTS client_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    investigation_name TEXT NOT NULL,
    result_text TEXT,
    result_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_investigations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read client_investigations" ON client_investigations;
CREATE POLICY "Allow public read client_investigations" ON client_investigations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert client_investigations" ON client_investigations;
CREATE POLICY "Allow public upsert client_investigations" ON client_investigations FOR ALL USING (true) WITH CHECK (true);

-- 9. Create inbody_uploads table
CREATE TABLE IF NOT EXISTS inbody_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    file_name TEXT,
    local_file_path TEXT,
    session_date DATE DEFAULT CURRENT_DATE,
    upload_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inbody_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read inbody_uploads" ON inbody_uploads;
CREATE POLICY "Allow public read inbody_uploads" ON inbody_uploads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert inbody_uploads" ON inbody_uploads;
CREATE POLICY "Allow public upsert inbody_uploads" ON inbody_uploads FOR ALL USING (true) WITH CHECK (true);

-- 10. Create lymphatic_measurements table
CREATE TABLE IF NOT EXISTS lymphatic_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    profile_local_id TEXT NOT NULL REFERENCES client_profiles(local_id) ON DELETE CASCADE,
    measurement_name TEXT NOT NULL,
    value TEXT,
    unit TEXT DEFAULT 'cm',
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lymphatic_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read lymphatic_measurements" ON lymphatic_measurements;
CREATE POLICY "Allow public read lymphatic_measurements" ON lymphatic_measurements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert lymphatic_measurements" ON lymphatic_measurements;
CREATE POLICY "Allow public upsert lymphatic_measurements" ON lymphatic_measurements FOR ALL USING (true) WITH CHECK (true);

-- 11. Create home_exercises table
CREATE TABLE IF NOT EXISTS home_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    sets TEXT,
    reps TEXT,
    frequency TEXT,
    notes TEXT,
    video_url TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE home_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read home_exercises" ON home_exercises;
CREATE POLICY "Allow public read home_exercises" ON home_exercises FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public upsert home_exercises" ON home_exercises;
CREATE POLICY "Allow public upsert home_exercises" ON home_exercises FOR ALL USING (true) WITH CHECK (true);

-- 12. Support Nutrition/Therapeutic sessions by adding session_type to the main sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type TEXT;

-- 13. Support multiple physical therapy subjective assessments and link objective findings
ALTER TABLE pt_subjective ADD COLUMN IF NOT EXISTS doctor_id INT;
ALTER TABLE pt_objective_rows ADD COLUMN IF NOT EXISTS subjective_local_id TEXT REFERENCES pt_subjective(local_id) ON DELETE CASCADE;
ALTER TABLE pt_objective_palpation ADD COLUMN IF NOT EXISTS subjective_local_id TEXT REFERENCES pt_subjective(local_id) ON DELETE CASCADE;
ALTER TABLE pt_objective_palpation ADD COLUMN IF NOT EXISTS doctor_id INT;

-- ==========================================
-- 14. Scale to Branches Migration
-- ==========================================

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add policy
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon" ON branches;
CREATE POLICY "Allow all for anon" ON branches FOR ALL USING (true);

-- Seed initial branches
INSERT INTO branches (id, name) VALUES (1, 'Banha Branch') ON CONFLICT (id) DO NOTHING;
INSERT INTO branches (id, name) VALUES (2, 'El Monofaya Branch') ON CONFLICT (id) DO NOTHING;

-- Add branch_id column to existing tables
-- 1. patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE patients SET branch_id = 1 WHERE branch_id IS NULL;

-- 2. doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE doctors SET branch_id = 1 WHERE branch_id IS NULL;

-- 3. sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE sessions SET branch_id = 1 WHERE branch_id IS NULL;

-- 4. assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE assessments SET branch_id = 1 WHERE branch_id IS NULL;

-- 5. exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE exercises SET branch_id = 1 WHERE branch_id IS NULL;

-- 6. payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE payments SET branch_id = 1 WHERE branch_id IS NULL;

-- 7. audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE audit_logs SET branch_id = 1 WHERE branch_id IS NULL;

-- 8. users
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);
UPDATE users SET branch_id = 1 WHERE branch_id IS NULL;

-- 9. client_profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE client_profiles SET branch_id = 1 WHERE branch_id IS NULL;

-- 10. home_exercises
ALTER TABLE home_exercises ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE home_exercises SET branch_id = 1 WHERE branch_id IS NULL;

-- 11. patientlogs (check-ins)
ALTER TABLE patientlogs ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE patientlogs SET branch_id = 1 WHERE branch_id IS NULL;

-- 12. paintests
ALTER TABLE paintests ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE paintests SET branch_id = 1 WHERE branch_id IS NULL;

-- 13. portal_appointments
ALTER TABLE portal_appointments ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE portal_appointments SET branch_id = 1 WHERE branch_id IS NULL;

-- 14. portal_users
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);
UPDATE portal_users SET branch_id = 1 WHERE branch_id IS NULL;

-- 15. assessment_results
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) DEFAULT 1;
UPDATE assessment_results SET branch_id = 1 WHERE branch_id IS NULL;

