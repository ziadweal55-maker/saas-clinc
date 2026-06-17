const express = require('express');
const router = express.Router();
const { adminAuthMiddleware } = require('../middlewares/adminAuth');
const adminController = require('../controllers/adminController');

// Auth (public)
router.post('/auth/login', adminController.adminLogin);

// All routes below require admin auth
router.use(adminAuthMiddleware);

router.get('/auth/me', adminController.getAdminMe);
router.get('/stats', adminController.getPlatformStats);
router.get('/audit-logs', adminController.getAuditLogs);

// Tenants
router.get('/tenants', adminController.listTenants);
router.get('/tenants/expiring', adminController.getExpiringTenants);
router.get('/tenants/:id', adminController.getTenant);
router.post('/tenants/:id/approve', adminController.approveTenant);
router.post('/tenants/:id/reject', adminController.rejectTenant);
router.patch('/tenants/:id/status', adminController.updateTenantStatus);
router.patch('/tenants/:id/features', adminController.updateTenantFeatures);
router.get('/tenants/:id/usage', adminController.getTenantUsage);
router.get('/tenants/:id/health', adminController.getTenantHealth);
router.get('/tenants/:id/history', adminController.getTenantHistory);
router.post('/tenants/:id/impersonate', adminController.impersonateTenant);
router.get('/tenants/:id/subscription', adminController.getTenantSubscription);
router.patch('/tenants/:id/subscription', adminController.updateTenantSubscription);

// Plans
router.get('/plans', adminController.listPlans);
router.post('/plans', adminController.createPlan);
router.patch('/plans/:id', adminController.updatePlan);

// Announcements
router.get('/announcements', adminController.listAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.patch('/announcements/:id', adminController.updateAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

module.exports = router;
