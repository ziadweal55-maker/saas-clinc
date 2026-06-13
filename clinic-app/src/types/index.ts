export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  age?: number;
  medical_history?: string;
  is_active?: number;
  sync_token?: string;
  created_at?: string;
  profile_type?: 'physical_therapy' | 'nutrition' | 'lymphatic' | 'none';
  profile_types?: string;
  pin?: string;
  address?: string;
  referral_source?: string;
}

export interface AssessmentResult {
  date: string;
  positives: number;
}

export interface PackageStatus {
  total: number;
  used: number;
}

export interface Exercise {
  id: number;
  name: string;
  category: string;
  type: string;
  instructions: string;
  video_url?: string;
  created_at: string;
}

export interface ClientExercise extends Exercise {
  client_exercise_id: number;
  exercise_id: number;
  sets: string;
  reps: string;
  frequency: string;
  notes: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface AuditLog {
  id: number;
  client_id: number;
  changed_field: string;
  old_value: string;
  new_value: string;
  admin_username: string;
  timestamp: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'doctor' | 'staff';
  doctor_id?: number;
  status?: 'active' | 'frozen';
  base_salary?: number;
}

export interface SyncPayload {
  patientData: {
    id: number;
    first_name: string;
    sync_token: string;
    pin: string;
  };
  exercises: any[];
}
