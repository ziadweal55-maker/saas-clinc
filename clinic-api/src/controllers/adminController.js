const { pool } = require('../config/db');
const { createTenantSchema } = require('../scripts/migrate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ADMIN_JWT_SECRET } = require('../middlewares/adminAuth');
const { logAdminAction } = require('../utils/adminAuditLogger');
const { sendApprovalEmail, sendRejectionEmail, sendAnnouncementBroadcast } = require('../utils/emailService');
require('dotenv').config();

// ─── AUTH ────────────────────────────────────────────────

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const result = await pool.query('SELECT * FROM public.admins WHERE email = $1 AND is_active = true', [email.trim().toLowerCase()]);
    if (result.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials.' });
    const admin = result.rows[0];
    if (!admin.password_hash) return res.status(401).json({ error: 'Account not configured. Use Supabase login.' });
    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name }, ADMIN_JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (e) {
    console.error('[ADMIN LOGIN]', e);
    return res.status(500).json({ error: e.message });
  }
};

exports.getAdminMe = async (req, res) => {
  return res.json({ admin: req.admin });
};

// ─── PLATFORM STATS ──────────────────────────────────────

exports.getPlatformStats = async (req, res) => {
  try {
    const [totalRes, byStatusRes, expiringRes, recentRes] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM public.tenants'),
      pool.query(`SELECT status, COUNT(*)::int as count FROM public.tenants GROUP BY status`),
      pool.query(`
        SELECT COUNT(*)::int as count FROM public.tenants t
        JOIN public.subscriptions s ON s.tenant_id = t.id
        WHERE t.status = 'active' AND s.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      `),
      pool.query(`SELECT id, name, email, status, created_at FROM public.tenants ORDER BY created_at DESC LIMIT 5`),
    ]);
    const statusMap = {};
    byStatusRes.rows.forEach(r => { statusMap[r.status] = r.count; });
    const recentTenants = recentRes.rows.map(r => ({
      id: r.id,
      subdomain: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      createdAt: r.created_at,
    }));
    return res.json({
      total: totalRes.rows[0].total,
      active: statusMap.active || 0,
      pending: statusMap.pending || 0,
      suspended: statusMap.suspended || 0,
      rejected: statusMap.rejected || 0,
      expiringSoon: expiringRes.rows[0].count,
      expiringIn7Days: expiringRes.rows[0].count,
      recentTenants,
    });
  } catch (e) {
    console.error('[ADMIN STATS]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── TENANTS LIST ─────────────────────────────────────────

exports.listTenants = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;
    if (status) { whereClauses.push(`t.status = $${paramIdx++}`); params.push(status); }
    if (search) { whereClauses.push(`(t.name ILIKE $${paramIdx} OR t.id ILIKE $${paramIdx} OR t.email ILIKE $${paramIdx})`); params.push(`%${search}%`); paramIdx++; }
    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM public.tenants t ${where}`, params);
    const dataRes = await pool.query(`
      SELECT t.id, t.name, t.email, t.status, t.logo_url, t.primary_color, t.created_at, t.approved_at, t.suspended_at, t.features,
             s.plan_id, s.status as sub_status, s.current_period_end
      FROM public.tenants t
      LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`, [...params, parseInt(limit), offset]);
    
    const mapped = dataRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      subdomain: row.id,
      email: row.email,
      status: row.status,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      suspendedAt: row.suspended_at,
      features: row.features,
      plan: row.plan_id || 'starter'
    }));

    return res.json({ tenants: mapped, total: countRes.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    console.error('[ADMIN LIST TENANTS]', e);
    return res.status(500).json({ error: e.message });
  }
};

exports.getTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.*, s.plan_id, s.status as sub_status, s.current_period_start, s.current_period_end, s.trial_extended_by, s.notes as sub_notes
      FROM public.tenants t
      LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
      WHERE t.id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tenant not found.' });
    
    const row = result.rows[0];
    const mapped = {
      id: row.id,
      name: row.name,
      subdomain: row.id,
      email: row.email,
      status: row.status,
      logoUrl: row.logo_url,
      primaryColor: row.primary_color,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      suspendedAt: row.suspended_at,
      features: row.features,
      plan: row.plan_id || 'starter'
    };

    return res.json(mapped);
  } catch (e) {
    console.error('[ADMIN GET TENANT]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── APPROVE / REJECT ─────────────────────────────────────

exports.approveTenant = async (req, res) => {
  const { id } = req.params;
  let client;
  try {
    client = await pool.connect();
    const tenantRes = await client.query('SELECT * FROM public.tenants WHERE id = $1', [id]);
    if (tenantRes.rowCount === 0) return res.status(404).json({ error: 'Tenant not found.' });
    const tenant = tenantRes.rows[0];
    if (tenant.status === 'active') return res.status(400).json({ error: 'Tenant is already active.' });

    await client.query('BEGIN');
    await client.query(`UPDATE public.tenants SET status = 'active', approved_at = NOW() WHERE id = $1`, [id]);
    await client.query(
      `INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by, reason)
       VALUES ($1, $2, 'active', $3, 'Admin approved')`,
      [id, tenant.status, req.admin.email]
    );
    await client.query('COMMIT');
    client.release();

    // Provision schema (if not already done)
    try { await createTenantSchema(id); } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    // Create initial admin user in tenant schema using the stored email as username
    if (tenant.email) {
      try {
        const tenantClient = await pool.connect();
        const schemaName = `tenant_${id}`;
        await tenantClient.query(`SET search_path TO ${schemaName}`);
        const existing = await tenantClient.query('SELECT id FROM Users WHERE username = $1', [tenant.email]);
        if (existing.rowCount === 0) {
          const tempHash = bcrypt.hashSync('ChangeMe123!', 10);
          await tenantClient.query(
            `INSERT INTO Users (username, password_hash, role, status, branch_id) VALUES ($1, $2, 'admin', 'active', 1)`,
            [tenant.email, tempHash]
          );
        }
        tenantClient.release();
      } catch (e) { console.error('[APPROVE] Failed to create admin user:', e.message); }
    }

    await logAdminAction(req.admin.email, 'approve_tenant', id, { tenantName: tenant.name }, req.ip);
    // Send approval email (non-blocking)
    sendApprovalEmail(tenant.email, tenant.name, id, `https://${id}.saasclinic.com`).catch(console.error);

    return res.json({ success: true, message: `Clinic '${tenant.name}' approved and provisioned.` });
  } catch (e) {
    try { if (client) await client.query('ROLLBACK'); } catch (_) {}
    if (client) client.release();
    console.error('[ADMIN APPROVE]', e);
    return res.status(500).json({ error: e.message });
  }
};

exports.rejectTenant = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const tenantRes = await pool.query('SELECT * FROM public.tenants WHERE id = $1', [id]);
    if (tenantRes.rowCount === 0) return res.status(404).json({ error: 'Tenant not found.' });
    const tenant = tenantRes.rows[0];
    await pool.query(
      `UPDATE public.tenants SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1 WHERE id = $2`,
      [reason || null, id]
    );
    await pool.query(
      `INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, 'rejected', $3, $4)`,
      [id, tenant.status, req.admin.email, reason || 'No reason provided']
    );
    await logAdminAction(req.admin.email, 'reject_tenant', id, { reason }, req.ip);
    sendRejectionEmail(tenant.email, tenant.name, reason).catch(console.error);
    return res.json({ success: true, message: `Clinic '${tenant.name}' rejected.` });
  } catch (e) {
    console.error('[ADMIN REJECT]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── STATUS TOGGLE ───────────────────────────────────────

exports.updateTenantStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const allowed = ['active', 'suspended'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  try {
    const tenantRes = await pool.query('SELECT * FROM public.tenants WHERE id = $1', [id]);
    if (tenantRes.rowCount === 0) return res.status(404).json({ error: 'Tenant not found.' });
    const tenant = tenantRes.rows[0];
    const updateFields = status === 'suspended'
      ? `status = 'suspended', suspended_at = NOW()`
      : `status = 'active', suspended_at = NULL`;
    await pool.query(`UPDATE public.tenants SET ${updateFields} WHERE id = $1`, [id]);
    await pool.query(
      `INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)`,
      [id, tenant.status, status, req.admin.email, reason || null]
    );
    const action = status === 'suspended' ? 'suspend_tenant' : 'reactivate_tenant';
    await logAdminAction(req.admin.email, action, id, { reason }, req.ip);
    return res.json({ success: true, message: `Clinic '${tenant.name}' status updated to '${status}'.` });
  } catch (e) {
    console.error('[ADMIN UPDATE STATUS]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── FEATURE FLAGS ───────────────────────────────────────

exports.updateTenantFeatures = async (req, res) => {
  const { id } = req.params;
  const { features } = req.body;
  if (!features || typeof features !== 'object') return res.status(400).json({ error: 'features must be an object.' });
  // Ensure core features are always true
  const safeFeatures = { ...features, calendar: true, patients: true };
  try {
    await pool.query('UPDATE public.tenants SET features = $1 WHERE id = $2', [JSON.stringify(safeFeatures), id]);
    await logAdminAction(req.admin.email, 'update_features', id, { features: safeFeatures }, req.ip);
    return res.json({ success: true, features: safeFeatures });
  } catch (e) {
    console.error('[ADMIN UPDATE FEATURES]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── USAGE METRICS ───────────────────────────────────────

exports.getTenantUsage = async (req, res) => {
  const { id } = req.params;
  const schemaName = `tenant_${id.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  try {
    // Check schema exists
    const schemaCheck = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`, [schemaName]);
    if (schemaCheck.rowCount === 0) return res.json({ schemaExists: false, storageBytes: 0, counts: {} });

    const tables = ['clients', 'appointments', 'sessions', 'payments', 'users', 'doctors', 'branches'];
    const countQueries = tables.map(t => pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."${t}"`).catch(() => ({ rows: [{ c: 0 }] })));
    const sizeQuery = pool.query(
      `SELECT COALESCE(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))), 0) as bytes 
       FROM pg_tables 
       WHERE schemaname = $1`,
      [schemaName]
    ).catch(() => ({ rows: [{ bytes: 0 }] }));

    const [sizeRes, ...countResults] = await Promise.all([sizeQuery, ...countQueries]);
    const counts = {};
    tables.forEach((t, i) => { counts[t] = countResults[i].rows[0].c; });

    return res.json({
      schemaExists: true,
      storageBytes: parseInt(sizeRes.rows[0]?.bytes || 0),
      storageMb: Math.round(parseInt(sizeRes.rows[0]?.bytes || 0) / 1024 / 1024 * 100) / 100,
      patients: counts.clients || 0,
      appointments: counts.appointments || 0,
      sessions: counts.sessions || 0,
      payments: counts.payments || 0,
      users: counts.users || 0,
      doctors: counts.doctors || 0,
      counts
    });
  } catch (e) {
    console.error('[ADMIN USAGE]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── HEALTH SCORE ─────────────────────────────────────────

exports.getTenantHealth = async (req, res) => {
  const { id } = req.params;
  const schemaName = `tenant_${id.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  try {
    const schemaCheck = await pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`, [schemaName]);
    if (schemaCheck.rowCount === 0) return res.json({ score: 0, checks: [], counts: {}, schemaExists: false });

    const [staff, doctors, clients, appointments, sessions] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."users" WHERE role != 'admin'`).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."doctors"`).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."clients"`).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."appointments"`).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(*)::int as c FROM "${schemaName}"."sessions"`).catch(() => ({ rows: [{ c: 0 }] })),
    ]);

    const checks = [
      { key: 'has_staff', label: 'Has Staff (non-admin)', passed: staff.rows[0].c > 0 },
      { key: 'has_doctors', label: 'Has Doctors', passed: doctors.rows[0].c > 0 },
      { key: 'has_clients', label: 'Has Patients', passed: clients.rows[0].c > 0 },
      { key: 'has_appointments', label: 'Has Appointments', passed: appointments.rows[0].c > 0 },
      { key: 'has_sessions', label: 'Has Clinical Sessions', passed: sessions.rows[0].c > 0 }
    ];
    const score = checks.filter(c => c.passed).length * 20;
    return res.json({ score, checks, counts: { staff: staff.rows[0].c, doctors: doctors.rows[0].c, clients: clients.rows[0].c, appointments: appointments.rows[0].c, sessions: sessions.rows[0].c }, schemaExists: true });
  } catch (e) {
    console.error('[ADMIN HEALTH]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── STATUS HISTORY ──────────────────────────────────────

exports.getTenantHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM public.tenant_status_history WHERE tenant_id = $1 ORDER BY changed_at DESC`,
      [id]
    );
    const mapped = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedBy: row.changed_by,
      reason: row.reason,
      createdAt: row.changed_at
    }));
    return res.json(mapped);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ─── IMPERSONATION ──────────────────────────────────────

exports.impersonateTenant = async (req, res) => {
  const { id } = req.params;
  const { JWT_SECRET } = require('../middlewares/auth');
  try {
    const tenantRes = await pool.query(`SELECT * FROM public.tenants WHERE id = $1 AND status = 'active'`, [id]);
    if (tenantRes.rowCount === 0) return res.status(400).json({ error: 'Cannot impersonate inactive or non-existent tenant.' });
    const tenant = tenantRes.rows[0];
    const token = jwt.sign(
      { tenantId: id, role: 'admin', username: `__support_${req.admin.email}`, branchId: 1, isImpersonation: true, impersonatedBy: req.admin.email },
      JWT_SECRET,
      { expiresIn: '30m' }
    );
    await logAdminAction(req.admin.email, 'impersonate_tenant', id, { tenantName: tenant.name }, req.ip);
    return res.json({ token, tenantId: id, expiresIn: 1800 });
  } catch (e) {
    console.error('[ADMIN IMPERSONATE]', e);
    return res.status(500).json({ error: e.message });
  }
};

// ─── SUBSCRIPTION ─────────────────────────────────────────

exports.getTenantSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const [subRes, histRes, planRes] = await Promise.all([
      pool.query(`SELECT s.*, p.name as plan_name, p.price_monthly, p.max_users, p.max_branches, p.max_storage_mb FROM public.subscriptions s LEFT JOIN public.plans p ON p.id = s.plan_id WHERE s.tenant_id = $1`, [id]),
      pool.query(`SELECT * FROM public.payment_history WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]),
      pool.query(`SELECT * FROM public.plans WHERE is_active = true ORDER BY price_monthly ASC`),
    ]);

    const sub = subRes.rows[0];
    const mappedSub = sub ? {
      planId: sub.plan_id,
      planName: sub.plan_name,
      trialEndsAt: sub.plan_id === 'starter' ? sub.current_period_end : null,
      subscriptionEndsAt: sub.plan_id !== 'starter' ? sub.current_period_end : null,
      paymentHistory: histRes.rows.map(p => ({
        id: p.id,
        date: p.created_at,
        amount: parseFloat(p.amount || 0),
        status: p.status,
        paymobId: p.paymob_order_id
      }))
    } : null;

    const mappedPlans = planRes.rows.map(p => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price_monthly || 0)
    }));

    return res.json({
      subscription: mappedSub,
      availablePlans: mappedPlans
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.updateTenantSubscription = async (req, res) => {
  const { id } = req.params;
  const planId = req.body.plan_id || req.body.planId;
  const extendDays = req.body.extend_days || req.body.extendTrialDays;
  const notes = req.body.notes;
  try {
    let updateParts = [];
    let params = [];
    let pIdx = 1;
    if (planId) { updateParts.push(`plan_id = $${pIdx++}`); params.push(planId); }
    if (notes !== undefined) { updateParts.push(`notes = $${pIdx++}`); params.push(notes); }
    if (extendDays) {
      updateParts.push(`current_period_end = current_period_end + ($${pIdx++} * INTERVAL '1 day')`); params.push(parseInt(extendDays));
      updateParts.push(`trial_extended_by = trial_extended_by + $${pIdx++}`); params.push(parseInt(extendDays));
    }
    if (updateParts.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(id);
    await pool.query(`UPDATE public.subscriptions SET ${updateParts.join(', ')} WHERE tenant_id = $${pIdx}`, params);
    await logAdminAction(req.admin.email, extendDays ? 'extend_trial' : 'change_plan', id, { planId, extendDays, notes }, req.ip);
    return res.json({ success: true });
  } catch (e) {
    console.error('[ADMIN UPDATE SUB]', e);
    return res.status(500).json({ error: e.message });
  }
};

exports.getExpiringTenants = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.name, t.email, t.created_at, s.current_period_end, s.plan_id, s.status as sub_status,
             EXTRACT(DAY FROM s.current_period_end - NOW())::int as days_remaining
      FROM public.tenants t
      JOIN public.subscriptions s ON s.tenant_id = t.id
      WHERE t.status = 'active' AND s.current_period_end < NOW() + INTERVAL '14 days'
      ORDER BY s.current_period_end ASC
    `);
    const mapped = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      subdomain: row.id,
      email: row.email,
      status: 'active',
      plan: row.plan_id || 'starter',
      createdAt: row.created_at
    }));
    return res.json(mapped);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────

exports.listAnnouncements = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM public.announcements ORDER BY created_at DESC`);
    return res.json(result.rows);
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

exports.createAnnouncement = async (req, res) => {
  const { title, body, type, target, expires_at, send_email } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required.' });
  try {
    const result = await pool.query(
      `INSERT INTO public.announcements (title, body, type, target, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, body, type || 'info', target || 'all', expires_at || null, req.admin.email]
    );
    const announcement = result.rows[0];
    if (send_email) {
      // Get all active clinic emails
      const emailsRes = await pool.query(`SELECT email FROM public.tenants WHERE status = 'active' AND email IS NOT NULL`);
      const emails = emailsRes.rows.map(r => r.email).filter(Boolean);
      sendAnnouncementBroadcast(announcement, emails).catch(console.error);
    }
    await logAdminAction(req.admin.email, 'send_announcement', null, { title, type, send_email }, req.ip);
    return res.json({ success: true, announcement });
  } catch (e) { console.error('[ADMIN ANNOUNCEMENT]', e); return res.status(500).json({ error: e.message }); }
};

exports.updateAnnouncement = async (req, res) => {
  const { id } = req.params;
  const { is_active, title, body, type, expires_at } = req.body;
  try {
    await pool.query(
      `UPDATE public.announcements SET is_active = COALESCE($1, is_active), title = COALESCE($2, title), body = COALESCE($3, body), type = COALESCE($4, type), expires_at = COALESCE($5, expires_at) WHERE id = $6`,
      [is_active, title, body, type, expires_at, id]
    );
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

exports.deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM public.announcements WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

// ─── PLANS ─────────────────────────────────────────────────

exports.listPlans = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.plans ORDER BY price_monthly ASC');
    return res.json(result.rows);
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

exports.createPlan = async (req, res) => {
  const { id, name, price_monthly, max_users, max_branches, max_storage_mb, max_patients, description } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required.' });
  try {
    const result = await pool.query(
      `INSERT INTO public.plans (id, name, price_monthly, max_users, max_branches, max_storage_mb, max_patients, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name, price_monthly || 0, max_users || null, max_branches || null, max_storage_mb || null, max_patients || null, description || null]
    );
    await logAdminAction(req.admin.email, 'create_plan', null, { planId: id }, req.ip);
    return res.json({ success: true, plan: result.rows[0] });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

exports.updatePlan = async (req, res) => {
  const { id } = req.params;
  const { name, price_monthly, max_users, max_branches, max_storage_mb, max_patients, description, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE public.plans SET name=COALESCE($1,name), price_monthly=COALESCE($2,price_monthly), max_users=COALESCE($3,max_users), max_branches=COALESCE($4,max_branches), max_storage_mb=COALESCE($5,max_storage_mb), max_patients=COALESCE($6,max_patients), description=COALESCE($7,description), is_active=COALESCE($8,is_active) WHERE id=$9`,
      [name, price_monthly, max_users, max_branches, max_storage_mb, max_patients, description, is_active, id]
    );
    await logAdminAction(req.admin.email, 'update_plan', null, { planId: id }, req.ip);
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

// ─── AUDIT LOGS ────────────────────────────────────────────

exports.getAuditLogs = async (req, res) => {
  const { page = 1, limit = 50, action, tenant_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = [];
    let params = [];
    let pIdx = 1;
    if (action) { where.push(`action = $${pIdx++}`); params.push(action); }
    if (tenant_id) { where.push(`target_tenant_id = $${pIdx++}`); params.push(tenant_id); }
    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as total FROM public.admin_audit_logs ${whereStr}`, params),
      pool.query(`SELECT * FROM public.admin_audit_logs ${whereStr} ORDER BY created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`, [...params, parseInt(limit), offset]),
    ]);
    return res.json({ logs: dataRes.rows, total: countRes.rows[0].total });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
