const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const { logAudit } = require('../utils/auditLogger');

// 1. GET Dashboard Stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  const showAllTime = req.query.showAllTime === 'true';
  const branchId = req.user.branchId || 1;
  try {
    const resetDateRes = await req.db.query("SELECT value FROM Settings WHERE key = 'dashboard_reset_date'");
    const resetDateVal = resetDateRes.rows[0]?.value || '1970-01-01 00:00:00';
    const sinceDate = showAllTime ? '1970-01-01 00:00:00' : resetDateVal;

    const [clientsRes, todayAppsRes, incomeRes] = await Promise.all([
      req.db.query(
        'SELECT COUNT(*)::int as count FROM Clients WHERE created_at >= $1 AND branch_id = $2', 
        [sinceDate, branchId]
      ),
      req.db.query(
        'SELECT COUNT(*)::int as count FROM Appointments WHERE DATE(appointment_date) = CURRENT_DATE AND branch_id = $1',
        [branchId]
      ),
      req.db.query(
        'SELECT COALESCE(SUM(amount), 0)::numeric as total FROM Payments WHERE payment_date >= $1 AND branch_id = $2', 
        [sinceDate, branchId]
      )
    ]);

    return res.json({
      clientsCount: clientsRes.rows[0].count,
      todayAppointments: todayAppsRes.rows[0].count,
      totalIncome: parseFloat(incomeRes.rows[0].total),
      resetDate: resetDateVal
    });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching dashboard stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. GET Today's Appointments
router.get('/today-appointments', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT a.*, c.first_name, c.last_name, c.phone, d.name as doctor_name 
       FROM Appointments a 
       JOIN Clients c ON a.client_id = c.id 
       LEFT JOIN Doctors d ON a.doctor_id = d.id 
       WHERE DATE(a.appointment_date) = CURRENT_DATE AND a.branch_id = $1
       ORDER BY a.appointment_date ASC`,
      [branchId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching today appointments:', error);
    return res.json([]);
  }
});

// 3. GET High Pain Alerts (Assessments with pain scale >= 7)
router.get('/high-pain-alerts', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT a.*, c.first_name, c.last_name 
       FROM Assessments a
       JOIN Clients c ON a.client_id = c.id 
       WHERE a.pain_scale >= 7 AND a.is_completed = 0 AND a.branch_id = $1
       ORDER BY a.assessment_date DESC`,
      [branchId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching high pain alerts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET Pain Test Results
router.get('/pain-test-results', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT pain_scale, COUNT(*)::int as count 
       FROM Assessments 
       WHERE pain_scale IS NOT NULL AND branch_id = $1
       GROUP BY pain_scale 
       ORDER BY pain_scale ASC`,
      [branchId]
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching pain test results:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET Active Sessions (sessions conducted today)
router.get('/active-sessions', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT s.*, c.first_name, c.last_name, d.name as doctor_name 
       FROM Sessions s 
       JOIN Clients c ON s.client_id = c.id 
       LEFT JOIN Doctors d ON s.doctor_id = d.id 
       WHERE DATE(s.session_date) = CURRENT_DATE AND s.branch_id = $1
       ORDER BY s.session_date DESC`,
      [branchId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching active sessions:', error);
    return res.json([]);
  }
});

// 6. GET Report Stats (date range reporting)
router.get('/report-stats', authMiddleware, async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire end day

  const docId = doctorId && doctorId !== 'undefined' ? parseInt(doctorId) : null;
  const branchId = req.user.branchId || 1;

  try {
    if (docId) {
      // Verify doctor belongs to the active branch
      const docCheck = await req.db.query('SELECT id FROM Doctors WHERE id = $1 AND branch_id = $2', [docId, branchId]);
      if (docCheck.rowCount === 0) {
        return res.status(403).json({ error: 'Access denied. Doctor belongs to another branch.' });
      }
    }

    // Define sessions query
    let sessionsQuery = 'SELECT COUNT(*)::int as count FROM Sessions WHERE session_date >= $1 AND session_date <= $2 AND branch_id = $3';
    let sessionsParams = [start, end, branchId];
    if (docId) {
      sessionsQuery += ' AND doctor_id = $4';
      sessionsParams.push(docId);
    }

    // Define loans query
    let loansQuery = 'SELECT COALESCE(SUM(amount), 0)::numeric as total FROM Loans WHERE loan_date >= $1 AND loan_date <= $2 AND branch_id = $3';
    let loansParams = [start, end, branchId];
    if (docId) {
      loansQuery += ' AND user_id IN (SELECT id FROM Users WHERE doctor_id = $4)';
      loansParams.push(docId);
    }

    // Define detailed sessions query
    let detSessionsQuery = `
      SELECT s.*, c.first_name, c.last_name, d.name as doctor_name 
      FROM Sessions s 
      JOIN Clients c ON s.client_id = c.id 
      LEFT JOIN Doctors d ON s.doctor_id = d.id 
      WHERE s.session_date >= $1 AND s.session_date <= $2 AND s.branch_id = $3
    `;
    let detSessionsParams = [start, end, branchId];
    if (docId) {
      detSessionsQuery += ' AND s.doctor_id = $4';
      detSessionsParams.push(docId);
    }
    detSessionsQuery += ' ORDER BY s.session_date DESC';

    // Define detailed loans query
    let detLoansQuery = `
      SELECT l.*, u.username as staff_name 
      FROM Loans l 
      JOIN Users u ON l.user_id = u.id 
      WHERE l.loan_date >= $1 AND l.loan_date <= $2 AND l.branch_id = $3
    `;
    let detLoansParams = [start, end, branchId];
    if (docId) {
      detLoansQuery += ' AND u.doctor_id = $4';
      detLoansParams.push(docId);
    }
    detLoansQuery += ' ORDER BY l.loan_date DESC';

    // Define detailed attendance query
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    let detAttendanceQuery = `
      SELECT al.*, u.username, u.role 
      FROM AttendanceLogs al
      JOIN Users u ON al.user_id = u.id 
      WHERE al.log_date >= $1 AND al.log_date <= $2 AND al.branch_id = $3
    `;
    let detAttendanceParams = [startStr, endStr, branchId];
    if (docId) {
      detAttendanceQuery += ' AND u.doctor_id = $4';
      detAttendanceParams.push(docId);
    }
    detAttendanceQuery += ' ORDER BY al.log_date DESC, u.username ASC';

    // Run all independent queries in parallel
    const [
      clientsRes,
      sessionsRes,
      incomeRes,
      loansRes,
      wastesRes,
      dailyRes,
      paymentsRes,
      detSessionsRes,
      detLoansRes,
      detWastesRes,
      detAttendanceRes
    ] = await Promise.all([
      req.db.query(
        'SELECT COUNT(*)::int as count FROM Clients WHERE created_at >= $1 AND created_at <= $2 AND branch_id = $3',
        [start, end, branchId]
      ),
      req.db.query(sessionsQuery, sessionsParams),
      req.db.query(
        'SELECT COALESCE(SUM(amount), 0)::numeric as total FROM Payments WHERE payment_date >= $1 AND payment_date <= $2 AND branch_id = $3',
        [start, end, branchId]
      ),
      req.db.query(loansQuery, loansParams),
      req.db.query(
        'SELECT COALESCE(SUM(total_cost), 0)::numeric as total FROM WasteItems WHERE created_at >= $1 AND created_at <= $2 AND branch_id = $3',
        [start, end, branchId]
      ),
      req.db.query(
        `SELECT DATE(payment_date) as date, SUM(amount)::numeric as amount 
         FROM Payments 
         WHERE payment_date >= $1 AND payment_date <= $2 AND branch_id = $3
         GROUP BY DATE(payment_date) 
         ORDER BY date ASC`,
        [start, end, branchId]
      ),
      req.db.query(
        `SELECT p.*, c.first_name, c.last_name 
         FROM Payments p 
         JOIN Clients c ON p.client_id = c.id 
         WHERE p.payment_date >= $1 AND p.payment_date <= $2 AND p.branch_id = $3
         ORDER BY p.payment_date DESC`,
        [start, end, branchId]
      ),
      req.db.query(detSessionsQuery, detSessionsParams),
      req.db.query(detLoansQuery, detLoansParams),
      req.db.query(
        'SELECT * FROM WasteItems WHERE created_at >= $1 AND created_at <= $2 AND branch_id = $3 ORDER BY created_at DESC',
        [start, end, branchId]
      ),
      req.db.query(detAttendanceQuery, detAttendanceParams)
    ]);

    return res.json({
      clientsInPeriod: clientsRes.rows[0].count,
      sessionsCount: sessionsRes.rows[0].count,
      totalIncome: parseFloat(incomeRes.rows[0].total),
      totalLoans: parseFloat(loansRes.rows[0].total),
      totalWastes: parseFloat(wastesRes.rows[0].total),
      dailyBreakdown: dailyRes.rows.map(r => ({ date: r.date, amount: parseFloat(r.amount) })),
      detailedPayments: paymentsRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      detailedSessions: detSessionsRes.rows.map(r => ({ ...r, payment_amount: parseFloat(r.payment_amount) })),
      loanDetails: detLoansRes.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })),
      wasteDetails: detWastesRes.rows.map(r => ({ ...r, total_cost: parseFloat(r.total_cost), unit_cost: parseFloat(r.unit_cost) })),
      attendanceLogs: detAttendanceRes.rows
    });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error compiling report stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 7. GET Finance Users list
router.get('/users', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT id, username, role, doctor_id, branch_id, status, base_salary::numeric as base_salary 
       FROM Users 
       WHERE branch_id = $1
       ORDER BY username ASC`,
      [branchId]
    );
    return res.json(result.rows.map(r => ({ ...r, base_salary: parseFloat(r.base_salary) })));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching finance users:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 8. GET Monthly Revenue
router.get('/monthly-revenue', authMiddleware, async (req, res) => {
  const { month } = req.query; // YYYY-MM
  if (!month) return res.status(400).json({ error: 'month parameter is required' });

  try {
    const branchId = req.user.branchId || 1;
    const result = await req.db.query(
      "SELECT COALESCE(SUM(amount), 0)::numeric as revenue FROM Payments WHERE TO_CHAR(payment_date, 'YYYY-MM') = $1 AND branch_id = $2",
      [month, branchId]
    );
    return res.json(parseFloat(result.rows[0].revenue));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching monthly revenue:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 9. GET Salary Records
router.get('/salary-records', authMiddleware, async (req, res) => {
  const { month } = req.query; // YYYY-MM
  if (!month) return res.status(400).json({ error: 'month parameter is required' });

  try {
    const branchId = req.user.branchId || 1;
    const result = await req.db.query(
      'SELECT * FROM SalaryRecords WHERE month = $1 AND branch_id = $2 ORDER BY created_at DESC',
      [month, branchId]
    );
    return res.json(result.rows.map(r => ({
      ...r,
      base_salary: parseFloat(r.base_salary),
      dynamic_salary: parseFloat(r.dynamic_salary),
      total_salary: parseFloat(r.total_salary)
    })));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching salary records:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 10. GET Doctor sessions count
router.get('/doctor-sessions-count', authMiddleware, async (req, res) => {
  const { doctorId, month } = req.query; // YYYY-MM
  if (!doctorId || !month) return res.status(400).json({ error: 'doctorId and month are required' });

  const branchId = req.user.branchId || 1;
  try {
    // Verify doctor belongs to the active branch
    const docCheck = await req.db.query('SELECT id FROM Doctors WHERE id = $1 AND branch_id = $2', [parseInt(doctorId), branchId]);
    if (docCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Doctor belongs to another branch.' });
    }

    const result = await req.db.query(
      "SELECT session_type, COUNT(*)::int as count FROM Sessions WHERE doctor_id = $1 AND TO_CHAR(session_date, 'YYYY-MM') = $2 AND branch_id = $3 GROUP BY session_type",
      [parseInt(doctorId), month, branchId]
    );

    let total = 0;
    const types = {
      'Physical Therapy': 0,
      'Nutrition': 0,
      'Lymphatic': 0,
      'Other': 0
    };

    result.rows.forEach(row => {
      const type = row.session_type ? row.session_type.trim() : '';
      const count = row.count || 0;
      total += count;

      if (type === 'Physical Therapy' || type.toLowerCase() === 'physical_therapy') {
        types['Physical Therapy'] += count;
      } else if (type === 'Nutrition' || type.toLowerCase() === 'nutrition') {
        types['Nutrition'] += count;
      } else if (type === 'Lymphatic' || type.toLowerCase() === 'lymphatic') {
        types['Lymphatic'] += count;
      } else {
        types['Other'] += count;
      }
    });

    return res.json({ total, types });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching doctor sessions count:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 11. GET Loans list
router.get('/loans', authMiddleware, async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month parameter is required' });

  try {
    const branchId = req.user.branchId || 1;
    const result = await req.db.query(
      `SELECT l.*, u.username as staff_name 
       FROM Loans l 
       JOIN Users u ON l.user_id = u.id 
       WHERE l.month = $1 AND l.branch_id = $2
       ORDER BY l.loan_date DESC`,
      [month, branchId]
    );
    return res.json(result.rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching loans:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 12. GET Waste Items list
router.get('/waste-items', authMiddleware, async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'date parameter is required' });

  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      'SELECT * FROM WasteItems WHERE waste_date = $1 AND branch_id = $2 ORDER BY created_at DESC',
      [date, branchId]
    );
    return res.json(result.rows.map(r => ({ ...r, total_cost: parseFloat(r.total_cost), unit_cost: parseFloat(r.unit_cost) })));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching waste items:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 13. GET Waste Days
router.get('/waste-days', authMiddleware, async (req, res) => {
  const { month } = req.query; // YYYY-MM
  if (!month) return res.status(400).json({ error: 'month parameter is required' });

  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      "SELECT DISTINCT waste_date FROM WasteItems WHERE waste_date LIKE $1 || '%' AND branch_id = $2 ORDER BY waste_date DESC",
      [month, branchId]
    );
    return res.json(result.rows.map(r => r.waste_date));
  } catch (error) {
    console.error('[FINANCE ROUTE] Error fetching waste days:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 14. GET Daily Summary
router.get('/daily-summary', authMiddleware, async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'date parameter is required' });

  const branchId = req.user.branchId || 1;
  try {
    // Total payments
    const paymentsRes = await req.db.query(
      'SELECT COALESCE(SUM(amount), 0)::numeric as total FROM Payments WHERE DATE(payment_date) = $1 AND branch_id = $2',
      [date, branchId]
    );

    // Total wastes
    const wastesRes = await req.db.query(
      'SELECT * FROM WasteItems WHERE waste_date = $1 AND branch_id = $2 ORDER BY created_at DESC',
      [date, branchId]
    );

    // Total loans
    const loansRes = await req.db.query(
      `SELECT l.*, u.username, u.role 
       FROM Loans l 
       JOIN Users u ON l.user_id = u.id 
       WHERE DATE(l.loan_date) = $1 AND l.branch_id = $2
       ORDER BY l.loan_date DESC`,
      [date, branchId]
    );

    const revenue = parseFloat(paymentsRes.rows[0].total) || 0;
    
    const wastes = wastesRes.rows.map(r => ({
      ...r,
      unit_cost: parseFloat(r.unit_cost),
      total_cost: parseFloat(r.total_cost),
      quantity: parseFloat(r.quantity)
    }));
    
    const totalWastes = wastes.reduce((sum, item) => sum + item.total_cost, 0);

    const loans = loansRes.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount)
    }));
    
    const totalLoans = loans.reduce((sum, item) => sum + item.amount, 0);

    const netRevenue = revenue - totalWastes - totalLoans;

    return res.json({
      date,
      revenue,
      totalLoans,
      totalWastes,
      netRevenue,
      loans,
      wastes
    });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error compiling daily summary:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 15. POST Update User Finance settings
router.post('/user-finance', authMiddleware, async (req, res) => {
  const { userId, base_salary } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    // Verify user belongs to the active branch
    const userCheck = await req.db.query('SELECT id FROM Users WHERE id = $1 AND branch_id = $2', [parseInt(userId), branchId]);
    if (userCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. User belongs to another branch.' });
    }

    await req.db.query(
      'UPDATE Users SET base_salary = $1 WHERE id = $2',
      [parseFloat(base_salary), parseInt(userId)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error updating user finance:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 16. POST Save Salary Record
router.post('/salary-record', authMiddleware, async (req, res) => {
  const { user_id, month, base_salary, dynamic_salary, sessions_count, total_salary } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    // Verify user belongs to the active branch
    const userCheck = await req.db.query('SELECT id FROM Users WHERE id = $1 AND branch_id = $2', [parseInt(user_id), branchId]);
    if (userCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. User belongs to another branch.' });
    }

    await req.db.query(
      `INSERT INTO SalaryRecords (user_id, month, base_salary, dynamic_salary, sessions_count, total_salary, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [parseInt(user_id), month, parseFloat(base_salary), parseFloat(dynamic_salary), parseInt(sessions_count), parseFloat(total_salary), branchId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error saving salary record:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 17. POST Add Loan
router.post('/loan', authMiddleware, async (req, res) => {
  const { user_id, amount, note, month } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    // Verify user belongs to the active branch
    const userCheck = await req.db.query('SELECT id FROM Users WHERE id = $1 AND branch_id = $2', [parseInt(user_id), branchId]);
    if (userCheck.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. User belongs to another branch.' });
    }

    await req.db.query(
      `INSERT INTO Loans (user_id, amount, note, month, branch_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [parseInt(user_id), parseFloat(amount), note || null, month, branchId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error adding loan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 18. DELETE Loan
router.delete('/loan/:id', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const check = await req.db.query('SELECT id FROM Loans WHERE id = $1 AND branch_id = $2', [parseInt(req.params.id), branchId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Loan belongs to another branch.' });
    }

    await req.db.query('DELETE FROM Loans WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error deleting loan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 19. POST Settle Loan
router.post('/settle-loan/:id', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const check = await req.db.query('SELECT id FROM Loans WHERE id = $1 AND branch_id = $2', [parseInt(req.params.id), branchId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Loan belongs to another branch.' });
    }

    await req.db.query(
      'UPDATE Loans SET is_settled = 1, settled_at = NOW() WHERE id = $1',
      [parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error settling loan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 20. POST Reset Loans (delete unsettled loans for month)
router.post('/reset-loans', authMiddleware, async (req, res) => {
  const { month } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    await req.db.query(
      'DELETE FROM Loans WHERE month = $1 AND is_settled = 0 AND branch_id = $2',
      [month, branchId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error resetting loans:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 21. POST Add Waste Item
router.post('/waste-item', authMiddleware, async (req, res) => {
  const { waste_date, item_name, quantity, unit_cost, total_cost } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    await req.db.query(
      `INSERT INTO WasteItems (waste_date, item_name, quantity, unit_cost, total_cost, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [waste_date, item_name, parseFloat(quantity), parseFloat(unit_cost), parseFloat(total_cost), branchId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error adding waste item:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 22. DELETE Waste Item
router.delete('/waste-item/:id', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const check = await req.db.query('SELECT id FROM WasteItems WHERE id = $1 AND branch_id = $2', [parseInt(req.params.id), branchId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Waste item belongs to another branch.' });
    }

    await req.db.query('DELETE FROM WasteItems WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error deleting waste item:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 23. POST Create Session Type
router.post('/session-type', authMiddleware, async (req, res) => {
  const { name, cost, num_sessions, is_active } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    await req.db.query(
      `INSERT INTO SessionTypes (name, cost, num_sessions, is_active, branch_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, parseFloat(cost), num_sessions ? parseInt(num_sessions) : null, is_active ? 1 : 0, branchId]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error creating session type:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 24. PUT Update Session Type
router.put('/session-type/:id', authMiddleware, async (req, res) => {
  const { name, cost, num_sessions, is_active } = req.body;
  const branchId = req.user.branchId || 1;
  try {
    const check = await req.db.query('SELECT id FROM SessionTypes WHERE id = $1 AND branch_id = $2', [parseInt(req.params.id), branchId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Session type belongs to another branch.' });
    }

    await req.db.query(
      `UPDATE SessionTypes SET name = $1, cost = $2, num_sessions = $3, is_active = $4
       WHERE id = $5`,
      [name, parseFloat(cost), num_sessions ? parseInt(num_sessions) : null, is_active ? 1 : 0, parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error updating session type:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 25. DELETE Session Type
router.delete('/session-type/:id', authMiddleware, async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const check = await req.db.query('SELECT id FROM SessionTypes WHERE id = $1 AND branch_id = $2', [parseInt(req.params.id), branchId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ error: 'Access denied. Session type belongs to another branch.' });
    }

    await req.db.query('DELETE FROM SessionTypes WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[FINANCE ROUTE] Error deleting session type:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
