const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { syncPackageSessions } = require('../utils/packageSync');
const { logAudit } = require('../utils/auditLogger');

// Get payments for a client
router.get('/', authMiddleware, async (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
  if (!clientId || isNaN(clientId)) {
    return res.status(400).json({ error: 'Valid client_id query param is required' });
  }

  try {
    const result = await req.db.query(
      'SELECT * FROM Payments WHERE client_id = $1 ORDER BY payment_date DESC',
      [clientId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PAYMENTS ROUTE] Error fetching payments:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create a new payment
router.post('/', authMiddleware, async (req, res) => {
  const paymentData = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const cid = parseInt(paymentData.client_id);
    const sessionTypeId = paymentData.session_type ? parseInt(paymentData.session_type) : null;

    if (isNaN(cid)) {
      return res.status(400).json({ error: 'Valid client_id is required' });
    }

    const result = await req.db.query(
      `INSERT INTO Payments (
        client_id, amount, payment_type, package_sessions_total, 
        package_sessions_used, session_type_id, branch_id
      ) VALUES ($1, $2, $3, $4, 0, $5, $6) RETURNING id`,
      [
        cid,
        paymentData.amount,
        paymentData.payment_type,
        paymentData.package_sessions_total || null,
        sessionTypeId,
        branchId
      ]
    );

    const paymentId = result.rows[0].id;
    
    // Automatically re-sync package sessions
    await syncPackageSessions(req.db, cid);
    
    await logAudit(
      req.db, 
      cid, 
      'payment_create', 
      'None', 
      `Payment amount: ${paymentData.amount}, type: ${paymentData.payment_type}`, 
      req.user.username
    );

    return res.json({ success: true, id: paymentId });
  } catch (error) {
    console.error('[PAYMENTS ROUTE] Error creating payment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update an existing payment
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { amount, payment_type, notes, package_sessions_total } = req.body;

  try {
    const pid = parseInt(id);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Valid payment ID is required' });
    }

    const existingRes = await req.db.query('SELECT * FROM Payments WHERE id = $1', [pid]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const existing = existingRes.rows[0];

    // Log to audit trail
    await logAudit(
      req.db,
      existing.client_id,
      'payment_edit',
      JSON.stringify({ amount: existing.amount, payment_type: existing.payment_type, package_sessions_total: existing.package_sessions_total }),
      JSON.stringify({ amount, payment_type, package_sessions_total }),
      req.user.username
    );

    await req.db.query(
      `UPDATE Payments 
       SET amount = $1, payment_type = $2, notes = $3, package_sessions_total = $4 
       WHERE id = $5`,
      [amount, payment_type, notes || null, package_sessions_total || 1, pid]
    );

    await syncPackageSessions(req.db, existing.client_id);

    return res.json({ success: true });
  } catch (error) {
    console.error('[PAYMENTS ROUTE] Error updating payment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const pid = parseInt(id);
    if (isNaN(pid)) {
      return res.status(400).json({ error: 'Valid payment ID is required' });
    }

    const existingRes = await req.db.query('SELECT * FROM Payments WHERE id = $1', [pid]);
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    const existing = existingRes.rows[0];

    await req.db.query('DELETE FROM Payments WHERE id = $1', [pid]);

    await syncPackageSessions(req.db, existing.client_id);

    await logAudit(
      req.db, 
      existing.client_id, 
      'payment_delete', 
      JSON.stringify(existing), 
      'Deleted', 
      req.user.username
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[PAYMENTS ROUTE] Error deleting payment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get client package sessions status
router.get('/package-status/:clientId', authMiddleware, async (req, res) => {
  const { clientId } = req.params;
  try {
    const result = await req.db.query(
      `SELECT 
         COALESCE(SUM(package_sessions_total), 0)::int as total, 
         COALESCE(SUM(package_sessions_used), 0)::int as used 
       FROM Payments 
       WHERE client_id = $1`,
      [parseInt(clientId)]
    );
    return res.json(result.rows[0] || { total: 0, used: 0 });
  } catch (error) {
    console.error('[PAYMENTS ROUTE] Error fetching package status:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
