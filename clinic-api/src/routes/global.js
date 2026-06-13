const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

// SaaS registration/signup
router.post('/register', tenantController.registerTenant);

// Query tenant settings (logo, color scheme, details)
router.get('/settings', tenantController.getTenantSettings);

// Paymob recurring subscription webhook
router.post('/subscriptions/webhook', tenantController.paymobWebhook);

module.exports = router;
