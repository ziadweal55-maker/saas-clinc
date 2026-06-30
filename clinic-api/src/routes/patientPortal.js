const express = require('express');
const router = express.Router();

// 1. Patient Login
router.post('/login', async (req, res) => {
  const { token, pin } = req.body;
  if (!token || !pin) {
    return res.status(400).json({ error: 'Sync token and PIN are required.' });
  }

  try {
    const result = await req.db.query(
      'SELECT id, first_name, last_name, sync_token FROM Clients WHERE sync_token = $1 AND pin = $2 AND is_active = 1',
      [token.trim(), pin.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid PIN or missing record.' });
    }

    return res.json({ success: true, patient: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Fetch Exercises for Patient
router.get('/exercises', async (req, res) => {
  const patientId = req.headers['x-patient-id'];
  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID header (x-patient-id) is required.' });
  }

  try {
    const result = await req.db.query(
      `SELECT 
        ceh.id, 
        ceh.sets, 
        ceh.reps, 
        ceh.frequency, 
        ceh.notes, 
        e.name as exercise_name, 
        e.instructions, 
        e.video_url,
        d.name as doctor_name
      FROM ClientExercisesHome ceh
      JOIN Exercises e ON ceh.exercise_id = e.id
      LEFT JOIN Doctors d ON ceh.doctor_id = d.id
      WHERE ceh.client_id = $1
      ORDER BY ceh.assigned_at DESC`,
      [parseInt(patientId)]
    );

    // Format output to match frontend client expected structure
    const formatted = result.rows.map(r => ({
      exercise_name: r.exercise_name,
      sets: r.sets,
      reps: r.reps,
      frequency: r.frequency,
      instructions: r.instructions,
      notes: r.notes,
      video_url: r.video_url,
      doctors: r.doctor_name ? { name: r.doctor_name } : null
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Log Check-In Feedback
router.post('/checkin', async (req, res) => {
  const patientId = req.headers['x-patient-id'];
  const { painLevel, notes } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID header (x-patient-id) is required.' });
  }
  if (painLevel === undefined) {
    return res.status(400).json({ error: 'Pain level is required.' });
  }

  try {
    await req.db.query('BEGIN');

    // 1. Insert into PatientLogs (Legacy check-in log)
    await req.db.query(
      'INSERT INTO PatientLogs (patient_id, pain_level, status) VALUES ($1, $2, $3)',
      [parseInt(patientId), parseInt(painLevel), 'Completed']
    );

    // 2. Insert into PatientPainTests (Detailed pain analysis log)
    await req.db.query(
      'INSERT INTO PatientPainTests (patient_id, test_type, pain_score, notes) VALUES ($1, $2, $3, $4)',
      [parseInt(patientId), 'Daily Recovery Check-in', parseInt(painLevel), notes || 'No specific observations provided.']
    );

    await req.db.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await req.db.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
