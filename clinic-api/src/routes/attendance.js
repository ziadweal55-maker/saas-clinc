const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');

// Clock-in
router.post('/clock-in', authMiddleware, async (req, res) => {
  const { userId, date, time } = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const logDate = date || new Date().toISOString().split('T')[0];
    const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

    const existingRes = await req.db.query(
      'SELECT id FROM AttendanceLogs WHERE user_id = $1 AND log_date = $2',
      [userId, logDate]
    );

    if (existingRes.rowCount > 0) {
      await req.db.query(
        'UPDATE AttendanceLogs SET check_in_time = $1 WHERE id = $2',
        [checkInTime, existingRes.rows[0].id]
      );
    } else {
      await req.db.query(
        'INSERT INTO AttendanceLogs (user_id, log_date, check_in_time, branch_id) VALUES ($1, $2, $3, $4)',
        [userId, logDate, checkInTime, branchId]
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[ATTENDANCE ROUTE] Error clocking in:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Clock-out
router.post('/clock-out', authMiddleware, async (req, res) => {
  const { userId, date, time } = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const logDate = date || new Date().toISOString().split('T')[0];
    const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

    const existingRes = await req.db.query(
      'SELECT id FROM AttendanceLogs WHERE user_id = $1 AND log_date = $2',
      [userId, logDate]
    );

    if (existingRes.rowCount > 0) {
      await req.db.query(
        'UPDATE AttendanceLogs SET check_out_time = $1 WHERE id = $2',
        [checkOutTime, existingRes.rows[0].id]
      );
    } else {
      await req.db.query(
        'INSERT INTO AttendanceLogs (user_id, log_date, check_out_time, branch_id) VALUES ($1, $2, $3, $4)',
        [userId, logDate, checkOutTime, branchId]
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[ATTENDANCE ROUTE] Error clocking out:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get attendance logs
router.get('/logs', authMiddleware, async (req, res) => {
  const { date } = req.query;
  const branchId = req.user.branchId || 1;

  try {
    const logDate = date || new Date().toISOString().split('T')[0];
    const result = await req.db.query(
      `SELECT u.id as user_id, u.username, u.role, 
              al.check_in_time, al.check_out_time, al.log_date
       FROM Users u
       LEFT JOIN AttendanceLogs al ON u.id = al.user_id AND al.log_date = $1
       WHERE u.branch_id = $2
       ORDER BY u.username ASC`,
      [logDate, branchId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('[ATTENDANCE ROUTE] Error fetching attendance logs:', error);
    return res.status(500).json([]);
  }
});

module.exports = router;
