const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middlewares/auth');

// Get active branches for general selectors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM Branches WHERE is_active = 1 ORDER BY name ASC');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all branches (including inactive ones for admin view)
router.get('/all', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM Branches ORDER BY name ASC');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Add branch
router.post('/', authMiddleware, authorize('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Branch name is required' });

  try {
    const result = await req.db.query(
      'INSERT INTO Branches (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    return res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Rename branch
router.put('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Branch name is required' });

  try {
    const result = await req.db.query(
      'UPDATE Branches SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), parseInt(id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Branch not found' });
    return res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Deactivate branch
router.patch('/:id/deactivate', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await req.db.query(
      'UPDATE Branches SET is_active = 0 WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Branch not found' });
    return res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Reactivate branch
router.patch('/:id/reactivate', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await req.db.query(
      'UPDATE Branches SET is_active = 1 WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Branch not found' });
    return res.json({ success: true, branch: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
