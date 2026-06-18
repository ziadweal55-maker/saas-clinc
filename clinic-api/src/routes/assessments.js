const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { logAudit } = require('../utils/auditLogger');

// Get assessments for a client
router.get('/', authMiddleware, async (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
  if (!clientId || isNaN(clientId)) {
    return res.status(400).json({ error: 'Valid client_id is required' });
  }

  try {
    const result = await req.db.query(`
      SELECT Assessments.*, Doctors.name as doctor_name 
      FROM Assessments 
      LEFT JOIN Doctors ON Assessments.doctor_id = Doctors.id
      WHERE client_id = $1 
      ORDER BY assessment_date DESC
    `, [clientId]);

    return res.json(result.rows);
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error fetching assessments:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create assessment
router.post('/', authMiddleware, async (req, res) => {
  const { client_id, doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed } = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const result = await req.db.query(`
      INSERT INTO Assessments (
        client_id, doctor_id, diagnosis, pain_scale, rom, 
        strength, recommendations, is_completed, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [
      client_id,
      doctor_id || null,
      diagnosis,
      pain_scale ? parseInt(pain_scale) : null,
      rom,
      strength,
      recommendations,
      is_completed ? 1 : 0,
      branchId
    ]);

    const assessmentId = result.rows[0].id;

    await logAudit(req.db, client_id, 'Assessment', 'None', `New Assessment by Doc ${doctor_id}`, req.user.username);

    return res.json({ success: true, id: assessmentId });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error creating assessment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update assessment
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { doctor_id, diagnosis, pain_scale, rom, strength, recommendations, is_completed } = req.body;

  try {
    const aid = parseInt(id);
    if (isNaN(aid)) {
      return res.status(400).json({ error: 'Valid assessment ID is required' });
    }

    const assessmentRes = await req.db.query('SELECT client_id, branch_id FROM Assessments WHERE id = $1', [aid]);
    if (assessmentRes.rowCount === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    if (assessmentRes.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Assessment does not belong to your branch.' });
    }
    const cid = assessmentRes.rows[0].client_id;

    await req.db.query(`
      UPDATE Assessments 
      SET doctor_id = $1, diagnosis = $2, pain_scale = $3, rom = $4, strength = $5, recommendations = $6, is_completed = $7
      WHERE id = $8
    `, [
      doctor_id || null,
      diagnosis,
      pain_scale ? parseInt(pain_scale) : null,
      rom,
      strength,
      recommendations,
      is_completed ? 1 : 0,
      aid
    ]);

    await logAudit(req.db, cid, 'Assessment', `Assessment #${aid}`, `Updated assessment details`, req.user.username);
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error updating assessment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete assessment
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const aid = parseInt(id);
    if (isNaN(aid)) {
      return res.status(400).json({ error: 'Valid assessment ID is required' });
    }

    const assessmentRes = await req.db.query('SELECT client_id, branch_id FROM Assessments WHERE id = $1', [aid]);
    if (assessmentRes.rowCount === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    if (assessmentRes.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Assessment does not belong to your branch.' });
    }
    const cid = assessmentRes.rows[0].client_id;

    await req.db.query('DELETE FROM Assessments WHERE id = $1', [aid]);

    await logAudit(req.db, cid, 'Assessment', `Assessment #${aid}`, 'Deleted physical assessment', req.user.username);
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error deleting assessment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get assessment regions and tests structure
router.get('/structure', authMiddleware, async (req, res) => {
  try {
    const regions = await req.db.query('SELECT * FROM AssessmentRegions ORDER BY sort_order ASC');
    const tests = await req.db.query('SELECT * FROM AssessmentTests ORDER BY id ASC');
    return res.json({
      regions: regions.rows,
      tests: tests.rows
    });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error fetching structure:', error);
    return res.status(500).json({ regions: [], tests: [] });
  }
});

// Get client assessment results
router.get('/results/:clientId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM AssessmentResults WHERE client_id = $1 ORDER BY created_at DESC',
      [parseInt(req.params.clientId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error fetching client assessment results:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Save client assessment result (upsert)
router.post('/results', authMiddleware, async (req, res) => {
  const { clientId, testId, result } = req.body;
  try {
    const existing = await req.db.query(
      'SELECT id FROM AssessmentResults WHERE client_id = $1 AND test_id = $2',
      [parseInt(clientId), parseInt(testId)]
    );
    if (existing.rowCount > 0) {
      await req.db.query(
        'UPDATE AssessmentResults SET result = $1, created_at = NOW() WHERE client_id = $2 AND test_id = $3',
        [result, parseInt(clientId), parseInt(testId)]
      );
    } else {
      await req.db.query(
        'INSERT INTO AssessmentResults (client_id, test_id, result) VALUES ($1, $2, $3)',
        [parseInt(clientId), parseInt(testId), result]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error saving assessment result:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Add assessment region
router.post('/regions', authMiddleware, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO AssessmentRegions (name) VALUES ($1) RETURNING id',
      [name.trim()]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error adding region:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update assessment region
router.put('/regions/:id', authMiddleware, async (req, res) => {
  const { name } = req.body;
  try {
    await req.db.query(
      'UPDATE AssessmentRegions SET name = $1 WHERE id = $2',
      [name.trim(), parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error updating region:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Delete assessment region
router.delete('/regions/:id', authMiddleware, async (req, res) => {
  const regionId = parseInt(req.params.id);
  try {
    await req.db.query('DELETE FROM AssessmentTests WHERE region_id = $1', [regionId]);
    await req.db.query('DELETE FROM AssessmentRegions WHERE id = $1', [regionId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error deleting region:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Add assessment test
router.post('/tests', authMiddleware, async (req, res) => {
  const { regionId, name, description } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO AssessmentTests (region_id, name, description) VALUES ($1, $2, $3) RETURNING id',
      [parseInt(regionId), name.trim(), description ? description.trim() : null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error adding test:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update assessment test
router.put('/tests/:id', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  try {
    await req.db.query(
      'UPDATE AssessmentTests SET name = $1, description = $2 WHERE id = $3',
      [name.trim(), description ? description.trim() : null, parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error updating test:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Delete assessment test
router.delete('/tests/:id', authMiddleware, async (req, res) => {
  const testId = parseInt(req.params.id);
  try {
    await req.db.query('DELETE FROM AssessmentResults WHERE test_id = $1', [testId]);
    await req.db.query('DELETE FROM AssessmentTests WHERE id = $1', [testId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[ASSESSMENTS ROUTE] Error deleting test:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
