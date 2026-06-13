const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { syncPackageSessions } = require('../utils/packageSync');
const { logAudit } = require('../utils/auditLogger');

// Get sessions for a client
router.get('/', authMiddleware, async (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
  if (!clientId || isNaN(clientId)) {
    return res.status(400).json({ error: 'Valid client_id is required' });
  }

  try {
    const result = await req.db.query(`
      SELECT Sessions.*, Doctors.name as doctor_name, SessionTypes.name as session_type_name
      FROM Sessions 
      LEFT JOIN Doctors ON Sessions.doctor_id = Doctors.id
      LEFT JOIN SessionTypes ON Sessions.session_type_id = SessionTypes.id
      WHERE client_id = $1 
      ORDER BY session_date DESC
    `, [clientId]);

    return res.json(result.rows);
  } catch (error) {
    console.error('[SESSIONS ROUTE] Error fetching sessions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create a new session
router.post('/', authMiddleware, async (req, res) => {
  const sessionData = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const { client_id, doctor_id, appointment_id, treatment_notes, progress_notes, session_number, payment_amount, payment_method } = sessionData;
    const cid = parseInt(client_id);
    const did = (doctor_id && !isNaN(parseInt(doctor_id))) ? parseInt(doctor_id) : null;
    const aid = (appointment_id && !isNaN(parseInt(appointment_id))) ? parseInt(appointment_id) : null;
    
    if (isNaN(cid)) {
      return res.status(400).json({ error: 'Invalid Client ID' });
    }

    const result = await req.db.query(
      `INSERT INTO Sessions (
        client_id, doctor_id, appointment_id, treatment_notes, progress_notes, 
        session_number, payment_amount, payment_method, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        cid, 
        did, 
        aid, 
        treatment_notes, 
        progress_notes, 
        session_number, 
        payment_amount || 0, 
        payment_method || 'Other', 
        branchId
      ]
    );

    const sessionId = result.rows[0].id;
    
    // Automatically re-sync package sessions
    await syncPackageSessions(req.db, cid);

    await logAudit(req.db, cid, 'Session', 'None', `New Session #${session_number} by Doc ${did}`, req.user.username);

    return res.json({ success: true, id: sessionId });
  } catch (error) {
    console.error('[SESSIONS ROUTE] Failed to create session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update an existing session
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const sessionData = req.body;

  try {
    const sid = parseInt(id);
    const { doctor_id, treatment_notes, progress_notes, session_number, payment_amount, payment_method } = sessionData;
    const did = (doctor_id && !isNaN(parseInt(doctor_id))) ? parseInt(doctor_id) : null;
    
    if (isNaN(sid)) {
      return res.status(400).json({ error: 'Invalid Session ID' });
    }

    // Fetch the client ID for this session to run sync afterwards
    const oldSessionRes = await req.db.query('SELECT client_id FROM Sessions WHERE id = $1', [sid]);
    if (oldSessionRes.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const cid = oldSessionRes.rows[0].client_id;

    await req.db.query(`
      UPDATE Sessions 
      SET doctor_id = $1, treatment_notes = $2, progress_notes = $3, session_number = $4, payment_amount = $5, payment_method = $6
      WHERE id = $7
    `, [did, treatment_notes, progress_notes, session_number, payment_amount || 0, payment_method || 'Other', sid]);

    // Sync package sessions
    await syncPackageSessions(req.db, cid);

    await logAudit(req.db, cid, 'Session', `Session #${session_number}`, `Updated Session #${session_number} by Doc ${did}`, req.user.username);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[SESSIONS ROUTE] Error updating session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete an existing session
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const sid = parseInt(id);
    if (isNaN(sid)) {
      return res.status(400).json({ error: 'Invalid Session ID' });
    }

    const sessionRes = await req.db.query('SELECT client_id, session_number FROM Sessions WHERE id = $1', [sid]);
    if (sessionRes.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const { client_id, session_number } = sessionRes.rows[0];

    await req.db.query('DELETE FROM Sessions WHERE id = $1', [sid]);

    // Sync package sessions
    await syncPackageSessions(req.db, client_id);

    await logAudit(req.db, client_id, 'Session', `Session #${session_number}`, 'Deleted session record', req.user.username);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[SESSIONS ROUTE] Error deleting session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all session types
router.get('/types', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM SessionTypes ORDER BY name ASC');
    return res.json(result.rows);
  } catch (error) {
    console.error('[SESSIONS ROUTE] Error fetching session types:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
