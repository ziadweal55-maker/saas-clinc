const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, authorize } = require('../middlewares/auth');

// Check if any users exist (used by setup view)
router.get('/exists', authController.checkUsersExist);

// Create first admin (only works if no users exist)
router.post('/setup-admin', authController.setupAdmin);

// Standard Login
router.post('/login', authController.loginUser);

// Pending staff/doctor registration request
router.post('/register-pending', authController.registerPendingUser);

// --- Protected Routes (Require admin role) ---

// Get pending/active account requests
router.get('/pending-requests', authMiddleware, authorize('admin'), authController.getPendingAccounts);

// Approve registration request
router.post('/approve-request', authMiddleware, authorize('admin'), authController.approveAccountRequest);

// Deny registration request
router.post('/deny-request', authMiddleware, authorize('admin'), authController.denyAccountRequest);

// Get all system users
router.get('/all', authMiddleware, authorize('admin'), authController.getAllUsers);

// Reset a user's password
router.post('/reset-password', authMiddleware, authorize('admin'), authController.resetUserPassword);

// Delete user account
router.post('/delete-user', authMiddleware, authorize('admin'), authController.deleteUserAccount);

// Update user status (freeze/unfreeze)
router.post('/update-status', authMiddleware, authorize('admin'), authController.updateUserStatus);

// Change own password
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
