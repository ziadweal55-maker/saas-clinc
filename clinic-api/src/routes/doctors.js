const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middlewares/auth');

// Get active doctors for selector dropdowns
router.get('/active', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      "SELECT * FROM Doctors WHERE status = 'active' AND branch_id = $1 ORDER BY name ASC",
      [branchId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all doctors (admin view)
router.get('/', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      "SELECT * FROM Doctors WHERE branch_id = $1 ORDER BY name ASC",
      [branchId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Add doctor (admin/manager)
router.post('/', authMiddleware, authorize('admin'), async (req, res) => {
  const { name, specialty, status } = req.body;
  const branchId = req.user.branchId || 1;

  if (!name) return res.status(400).json({ error: 'Doctor name is required' });

  try {
    const result = await req.db.query(
      'INSERT INTO Doctors (name, specialty, status, branch_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), specialty || null, status || 'active', branchId]
    );
    return res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update doctor
router.put('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, specialty, status } = req.body;

  if (!name) return res.status(400).json({ error: 'Doctor name is required' });

  try {
    const doc = await req.db.query('SELECT branch_id FROM Doctors WHERE id = $1', [id]);
    if (!doc.rows[0]) return res.status(404).json({ error: 'Doctor not found.' });
    if (doc.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Doctor belongs to another branch.' });
    }

    const result = await req.db.query(
      'UPDATE Doctors SET name = $1, specialty = $2, status = $3 WHERE id = $4 RETURNING *',
      [name.trim(), specialty || null, status || 'active', parseInt(id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Doctor not found' });
    return res.json({ success: true, doctor: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete doctor
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const doc = await req.db.query('SELECT branch_id FROM Doctors WHERE id = $1', [id]);
    if (!doc.rows[0]) return res.status(404).json({ error: 'Doctor not found.' });
    if (doc.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Doctor belongs to another branch.' });
    }

    const result = await req.db.query(
      'DELETE FROM Doctors WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Doctor not found' });
    return res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
