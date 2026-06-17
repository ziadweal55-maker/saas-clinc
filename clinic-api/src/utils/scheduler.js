const cron = require('node-cron');
const { pool } = require('../config/db');
const { sendExpiryWarningEmail, sendSuspendedEmail } = require('./emailService');
const { logAdminAction } = require('./adminAuditLogger');

const runDailyChecks = async () => {
  console.log('[SCHEDULER] Running daily subscription checks...');
  try {
    // 1. Send expiry warnings for clinics expiring in exactly 7 days
    const expiringSoon = await pool.query(`
      SELECT t.id, t.name, t.email, s.current_period_end
      FROM public.tenants t
      JOIN public.subscriptions s ON s.tenant_id = t.id
      WHERE t.status = 'active'
        AND s.current_period_end::date = CURRENT_DATE + INTERVAL '7 days'
    `);
    for (const clinic of expiringSoon.rows) {
      await sendExpiryWarningEmail(clinic.email, clinic.name, clinic.current_period_end);
      console.log(`[SCHEDULER] Expiry warning → ${clinic.name}`);
    }

    // 2. Auto-suspend expired clinics (expired > 1 day ago, sub not active)
    const expired = await pool.query(`
      SELECT t.id, t.name, t.email
      FROM public.tenants t
      JOIN public.subscriptions s ON s.tenant_id = t.id
      WHERE t.status = 'active'
        AND s.status != 'active'
        AND s.current_period_end < NOW() - INTERVAL '1 day'
    `);
    for (const clinic of expired.rows) {
      await pool.query(`UPDATE public.tenants SET status = 'suspended', suspended_at = NOW() WHERE id = $1`, [clinic.id]);
      await pool.query(
        `INSERT INTO public.tenant_status_history (tenant_id, old_status, new_status, changed_by, reason) VALUES ($1,'active','suspended','system','Subscription expired')`,
        [clinic.id]
      );
      await sendSuspendedEmail(clinic.email, clinic.name);
      await logAdminAction('system@scheduler', 'auto_suspend_tenant', clinic.id, { reason: 'subscription_expired' }, '0.0.0.0');
      console.log(`[SCHEDULER] Auto-suspended: ${clinic.name}`);
    }
    console.log(`[SCHEDULER] Done. Warned: ${expiringSoon.rowCount}, Suspended: ${expired.rowCount}`);
  } catch (e) {
    console.error('[SCHEDULER] Error during daily checks:', e.message);
  }
};

// Run every day at 8:00 AM
cron.schedule('0 8 * * *', runDailyChecks);

console.log('[SCHEDULER] Daily subscription checks scheduled (08:00 daily)');

module.exports = { runDailyChecks };
