-- Supabase Schema for Revive Clinic

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    medical_history TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sync_token TEXT UNIQUE,
    pin TEXT, -- For portal access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update updated_at for patients
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Doctors Table (Managed in Windows App only)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    specialty TEXT,
    status TEXT DEFAULT 'active', -- 'active' or 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_number INTEGER,
    notes TEXT,
    payment_amount DECIMAL(10, 2),
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    diagnosis TEXT,
    pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
    rom TEXT,
    strength TEXT,
    recommendations TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    assessment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises Table (Exercise Plans)
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    type TEXT,
    sets TEXT,
    reps TEXT,
    frequency TEXT,
    notes TEXT,
    instructions TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, exercise_name)
);

-- Trigger to update updated_at for exercises
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Payments Table (Audit/Revenue)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    changed_field TEXT,
    old_value TEXT,
    new_value TEXT,
    admin_username TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bio-Metric Assessment Structure
CREATE TABLE IF NOT EXISTS assessment_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES assessment_regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, name)
);

CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    test_id UUID REFERENCES assessment_tests(id) ON DELETE CASCADE,
    result TEXT, -- 'Positive' or 'Negative'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for Admin access using service_role or authenticated if we use Supabase Auth)
-- For now, since the user is using the anon key for sync, we allow all for demo purposes 
-- (In production, you should use Supabase Auth or service role)
CREATE POLICY "Allow all for anon" ON patients FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON doctors FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON assessments FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON exercises FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON assessment_regions FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON assessment_tests FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON assessment_results FOR ALL USING (true);

-- --- DATA RETENTION POLICY (AUTO-CLEANUP) ---

-- Enable pg_cron extension (In Supabase, this can also be enabled in the dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup function to delete data older than 30 days
-- This targets high-volume transactional data to save space on the free plan
CREATE OR REPLACE FUNCTION delete_old_sync_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete logs older than 30 days (these aren't always tied to a patient delete cascade)
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '30 days';

    -- Delete patients who haven't been synced/updated in 30 days.
    -- This will CASCADE and delete all their sessions, assessments, results, etc.
    -- The desktop app remains the long-term source of truth.
    DELETE FROM patients WHERE updated_at < NOW() - INTERVAL '30 days';

    -- Prune exercises that might not have been caught by patient cascade
    DELETE FROM exercises WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule the cleanup to run every day at midnight (00:00)
-- This ensures the Supabase storage doesn't exceed free tier limits.
SELECT cron.schedule('daily-data-cleanup', '0 0 * * *', 'SELECT delete_old_sync_data()');
