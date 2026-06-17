const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { pool } = require('../config/db');

// SaaS registration/signup
router.post('/register', tenantController.registerTenant);

// Query tenant settings (logo, color scheme, details, features)
router.get('/settings', tenantController.getTenantSettings);

// Paymob recurring subscription webhook
router.post('/subscriptions/webhook', tenantController.paymobWebhook);

// Get active announcements (for clinic app, no auth required)
router.get('/announcements', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenant;
  try {
    const result = await pool.query(
      `SELECT id, title, body, type, created_at FROM public.announcements
       WHERE is_active = true AND (target = 'all' OR target = $1)
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 10`,
      [tenantId || 'all']
    );
    return res.json(result.rows);
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

module.exports = router;

