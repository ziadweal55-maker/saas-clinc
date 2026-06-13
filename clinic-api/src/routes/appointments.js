const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { syncPackageSessions } = require('../utils/packageSync');

// Get all appointments (scoped by branch_id, optionally filtered by doctorId)
router.get('/', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  const doctorId = req.query.doctorId ? parseInt(req.query.doctorId) : null;

  try {
    let queryText = `
      SELECT 
        Appointments.*, 
        Clients.first_name as client_first_name, 
        Clients.last_name as client_last_name,
        Clients.phone as client_phone,
        Doctors.name as doctor_name
      FROM Appointments 
      JOIN Clients ON Appointments.client_id = Clients.id 
      LEFT JOIN Doctors ON Appointments.doctor_id = Doctors.id
      WHERE Appointments.branch_id = $1
    `;
    const params = [branchId];

    if (doctorId) {
      params.push(doctorId);
      queryText += ` AND Appointments.doctor_id = $2`;
    }

    queryText += ` ORDER BY appointment_date ASC`;

    const result = await req.db.query(queryText, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('[APPOINTMENTS ROUTE] Error fetching appointments:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Create a new appointment
router.post('/', authMiddleware, async (req, res) => {
  const appointmentData = req.body;
  const branchId = req.user.branchId || 1;

  try {
    const ALLOWED_SESSION_TYPES = ['Physical Therapy', 'Nutrition', 'Lymphatic', 'Other'];
    const sessionType = appointmentData.session_type;
    if (!sessionType || !ALLOWED_SESSION_TYPES.includes(sessionType)) {
      return res.status(400).json({ error: 'Valid session type is required.' });
    }

    const result = await req.db.query(
      `INSERT INTO Appointments (client_id, doctor_id, appointment_date, status, session_type, branch_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        parseInt(appointmentData.client_id),
        appointmentData.doctor_id || null,
        appointmentData.appointment_date,
        appointmentData.status || 'Scheduled',
        sessionType,
        branchId
      ]
    );

    return res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('[APPOINTMENTS ROUTE] Failed to create appointment:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Update an appointment
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { appointment_date, status, completed_by_staff_id, treatment_notes, progress_notes, doctor_id, session_type } = req.body;

  try {
    const ALLOWED_SESSION_TYPES = ['Physical Therapy', 'Nutrition', 'Lymphatic', 'Other'];
    if (session_type && !ALLOWED_SESSION_TYPES.includes(session_type)) {
      return res.status(400).json({ error: 'Invalid session type.' });
    }

    const did = doctor_id ? parseInt(doctor_id) : null;
    const appId = parseInt(id);

    if (did) {
      await req.db.query(
        `UPDATE Appointments 
         SET appointment_date = $1, status = $2, completed_by_staff_id = $3, doctor_id = $4, session_type = $5 
         WHERE id = $6`,
        [appointment_date, status, completed_by_staff_id || null, did, session_type || null, appId]
      );
      
      // Also update any synced session to match the doctor and session type
      await req.db.query(
        `UPDATE Sessions SET doctor_id = $1, session_type = $2 WHERE appointment_id = $3`,
        [did, session_type || null, appId]
      );
    } else {
      await req.db.query(
        `UPDATE Appointments 
         SET appointment_date = $1, status = $2, completed_by_staff_id = $3, session_type = $4 
         WHERE id = $5`,
        [appointment_date, status, completed_by_staff_id || null, session_type || null, appId]
      );

      await req.db.query(
        `UPDATE Sessions SET session_type = $1 WHERE appointment_id = $2`,
        [session_type || null, appId]
      );
    }
    
    // If marked as Completed, create a session record
    if (status === 'Completed') {
      const aptQuery = await req.db.query('SELECT * FROM Appointments WHERE id = $1', [appId]);
      if (aptQuery.rowCount > 0) {
        const apt = aptQuery.rows[0];
        
        const existingSession = await req.db.query('SELECT id FROM Sessions WHERE appointment_id = $1', [appId]);
        if (existingSession.rowCount === 0) {
          const countQuery = await req.db.query('SELECT COUNT(*) as count FROM Sessions WHERE client_id = $1', [apt.client_id]);
          const sessionCount = parseInt(countQuery.rows[0].count);
          
          await req.db.query(
            `INSERT INTO Sessions (client_id, doctor_id, appointment_id, treatment_notes, progress_notes, session_number, session_type) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              apt.client_id, 
              apt.doctor_id, 
              appId, 
              treatment_notes || 'Session completed', 
              progress_notes || '', 
              sessionCount + 1, 
              apt.session_type
            ]
          );
          
          await syncPackageSessions(req.db, apt.client_id);
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[APPOINTMENTS ROUTE] Error updating appointment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete appointment
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await req.db.query('DELETE FROM Appointments WHERE id = $1', [parseInt(id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[APPOINTMENTS ROUTE] Error deleting appointment:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
