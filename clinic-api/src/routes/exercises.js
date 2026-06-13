const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { logAudit } = require('../utils/auditLogger');

// GET all exercises & regions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const regions = await req.db.query('SELECT * FROM ExerciseRegions ORDER BY sort_order ASC');
    const exercises = await req.db.query('SELECT * FROM Exercises ORDER BY name ASC');
    return res.json({
      regions: regions.rows,
      exercises: exercises.rows
    });
  } catch (error) {
    console.error('[EXERCISES ROUTE] Error fetching exercises:', error);
    return res.status(550).json({ regions: [], exercises: [] });
  }
});

// ADD exercise region
router.post('/regions', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Region name is required' });

  try {
    const result = await req.db.query(
      'INSERT INTO ExerciseRegions (name) VALUES ($1) RETURNING id',
      [name.trim()]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE exercise region
router.put('/regions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Region name is required' });

  try {
    await req.db.query(
      'UPDATE ExerciseRegions SET name = $1 WHERE id = $2',
      [name.trim(), parseInt(id)]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE exercise region
router.delete('/regions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const rId = parseInt(id);

  try {
    await req.db.query('DELETE FROM Exercises WHERE region_id = $1', [rId]);
    await req.db.query('DELETE FROM ExerciseRegions WHERE id = $1', [rId]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ADD exercise
router.post('/', authMiddleware, async (req, res) => {
  const { regionId, name, type, instructions, video_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Exercise name is required' });

  try {
    const result = await req.db.query(
      `INSERT INTO Exercises (region_id, name, type, instructions, video_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [regionId || null, name.trim(), type || null, instructions || null, video_url || null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE exercise
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, type, instructions, video_url } = req.body;

  try {
    await req.db.query(
      `UPDATE Exercises 
       SET name = $1, type = $2, instructions = $3, video_url = $4 
       WHERE id = $5`,
      [name.trim(), type || null, instructions || null, video_url || null, parseInt(id)]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE exercise
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const exId = parseInt(id);

  try {
    await req.db.query('DELETE FROM ClientExercises WHERE exercise_id = $1', [exId]);
    await req.db.query('DELETE FROM Exercises WHERE id = $1', [exId]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET client exercises
router.get('/client/:clientId', authMiddleware, async (req, res) => {
  const { clientId } = req.params;
  try {
    const result = await req.db.query(`
      SELECT ce.*, e.name as exercise_name, e.instructions, e.video_url, e.region_id, er.name as region_name, Doctors.name as doctor_name
      FROM ClientExercises ce
      JOIN Exercises e ON ce.exercise_id = e.id
      JOIN ExerciseRegions er ON e.region_id = er.id
      LEFT JOIN Doctors ON ce.doctor_id = Doctors.id
      WHERE ce.client_id = $1
    `, [parseInt(clientId)]);
    return res.json(result.rows);
  } catch (error) {
    console.error('[EXERCISES ROUTE] Error fetching client exercises:', error);
    return res.json([]);
  }
});

// ASSIGN exercise
router.post('/assign', authMiddleware, async (req, res) => {
  const { client_id, exercise_id, doctor_id, sets, reps, frequency, notes } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO ClientExercises (client_id, exercise_id, doctor_id, sets, reps, frequency, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [client_id, exercise_id, doctor_id || null, sets, reps, frequency, notes]
    );

    await logAudit(req.db, client_id, 'Exercise Plan', 'None', `New Exercise Assigned by Doc ${doctor_id}`, req.user.username);

    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// REMOVE client exercise
router.delete('/client/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.query('DELETE FROM ClientExercises WHERE id = $1', [parseInt(id)]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// LOG exercise progress
router.post('/progress', authMiddleware, async (req, res) => {
  const { clientExerciseId, sessionId, sets, reps, notes } = req.body;
  try {
    await req.db.query(
      `INSERT INTO ExerciseSessionLogs (client_exercise_id, session_id, sets_completed, reps_completed, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [clientExerciseId, sessionId, sets, reps, notes]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET home exercises
router.get('/home/:clientId', authMiddleware, async (req, res) => {
  const { clientId } = req.params;
  try {
    const result = await req.db.query(`
      SELECT he.*, e.name as exercise_name, e.instructions, e.video_url, er.name as region_name
      FROM ClientExercisesHome he
      JOIN Exercises e ON he.exercise_id = e.id
      LEFT JOIN ExerciseRegions er ON e.region_id = er.id
      WHERE he.client_id = $1
      ORDER BY he.assigned_at DESC
    `, [parseInt(clientId)]);
    return res.json(result.rows);
  } catch (error) {
    return res.json([]);
  }
});

// ASSIGN home exercise
router.post('/home/assign', authMiddleware, async (req, res) => {
  const { client_id, exercise_id, doctor_id, sets, reps, frequency, notes, profile_id } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO ClientExercisesHome (client_id, exercise_id, doctor_id, sets, reps, frequency, notes, profile_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [client_id, exercise_id, doctor_id || null, sets, reps, frequency, notes, profile_id || null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// REMOVE home exercise
router.delete('/home/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.query('DELETE FROM ClientExercisesHome WHERE id = $1', [parseInt(id)]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE home exercise
router.put('/home/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { sets, reps, frequency, notes } = req.body;
  try {
    await req.db.query(
      `UPDATE ClientExercisesHome 
       SET sets = $1, reps = $2, frequency = $3, notes = $4, updated_at = NOW() 
       WHERE id = $5`,
      [sets || null, reps || null, frequency || null, notes || null, parseInt(id)]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
