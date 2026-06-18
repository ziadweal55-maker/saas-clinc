const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middlewares/auth');

// Get all clients (scoped by branch_id) with pagination
router.get('/', authMiddleware, async (req, res) => {
  const branchId = req.query.branchId ? parseInt(req.query.branchId) : req.user.branchId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const [countRes, dataRes] = await Promise.all([
      req.db.query('SELECT COUNT(*)::int as count FROM Clients WHERE branch_id = $1', [branchId]),
      req.db.query(`
        SELECT c.*, (
          SELECT string_agg(cp.profile_type, ',') 
          FROM ClientProfiles cp 
          WHERE cp.client_id = c.id
        ) as profile_types 
        FROM Clients c 
        WHERE c.branch_id = $1
        ORDER BY c.last_name ASC
        LIMIT $2 OFFSET $3
      `, [branchId, limit, offset])
    ]);

    return res.json({
      data: dataRes.rows,
      total: countRes.rows[0].count,
      page,
      limit
    });
  } catch (err) {
    console.error('[CLIENTS ROUTE] Error fetching clients:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get single client
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await req.db.query('SELECT * FROM Clients WHERE id = $1', [parseInt(id)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = result.rows[0];
    if (client.branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Client does not belong to your branch.' });
    }
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new client
router.post('/', authMiddleware, async (req, res) => {
  const clientData = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const result = await req.db.query(`
      INSERT INTO Clients (
        first_name, last_name, phone, age, medical_history, 
        sync_token, pin, address, referral_source, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      clientData.first_name,
      clientData.last_name,
      clientData.phone,
      clientData.age ? parseInt(clientData.age) : null,
      clientData.medical_history,
      clientData.sync_token || null,
      clientData.pin || null,
      clientData.address || null,
      clientData.referral_source || null,
      branchId
    ]);

    const clientId = result.rows[0].id;

    // Automatically create profile if selected
    if (clientData.profile_type && clientData.profile_type !== 'none') {
      try {
        await req.db.query(`
          INSERT INTO ClientProfiles (client_id, profile_type, name)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [clientId, clientData.profile_type, `${clientData.first_name}'s Profile`]);
      } catch (profileErr) {
        console.error('[CLIENTS ROUTE] Error auto-creating profile:', profileErr);
      }
    }

    return res.json({ success: true, id: clientId });
  } catch (err) {
    console.error('[CLIENTS ROUTE] Error creating client:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Update client
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const clientData = req.body;

  try {
    const clientCheck = await req.db.query('SELECT branch_id FROM Clients WHERE id = $1', [parseInt(id)]);
    if (clientCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    if (clientCheck.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Client does not belong to your branch.' });
    }

    const result = await req.db.query(`
      UPDATE Clients SET 
        first_name = $1, last_name = $2, phone = $3, age = $4, 
        medical_history = $5, sync_token = $6, pin = $7, 
        address = $8, referral_source = $9 
      WHERE id = $10
      RETURNING *
    `, [
      clientData.first_name,
      clientData.last_name,
      clientData.phone,
      clientData.age ? parseInt(clientData.age) : null,
      clientData.medical_history,
      clientData.sync_token || null,
      clientData.pin || null,
      clientData.address || null,
      clientData.referral_source || null,
      parseInt(id)
    ]);

    return res.json({ success: true, client: result.rows[0] });
  } catch (err) {
    console.error('[CLIENTS ROUTE] Error updating client:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Toggle client active status
router.patch('/:id/toggle-status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 1 for active, 0 for inactive

  try {
    const result = await req.db.query(
      'UPDATE Clients SET is_active = $1 WHERE id = $2 RETURNING *',
      [parseInt(status) ? 1 : 0, parseInt(id)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.json({ success: true, client: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete client
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const clientCheck = await req.db.query('SELECT branch_id FROM Clients WHERE id = $1', [parseInt(id)]);
    if (clientCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    if (clientCheck.rows[0].branch_id !== req.user.branchId && req.user.role !== 'admin' && req.user.role !== 'cfo') {
      return res.status(403).json({ error: 'Access denied. Client does not belong to your branch.' });
    }

    const result = await req.db.query('DELETE FROM Clients WHERE id = $1 RETURNING *', [parseInt(id)]);
    return res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
