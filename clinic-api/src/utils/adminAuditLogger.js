const { pool } = require('../config/db');

exports.logAdminAction = async (adminEmail, action, targetTenantId, metadata = {}, ipAddress = '') => {
  try {
    await pool.query(
      `INSERT INTO public.admin_audit_logs (admin_email, action, target_tenant_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminEmail, action, targetTenantId || null, JSON.stringify(metadata), ipAddress]
    );
  } catch (e) {
    console.error('[ADMIN AUDIT] Failed to log action:', e.message);
  }
};
