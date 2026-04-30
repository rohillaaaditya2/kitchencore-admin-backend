const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const adminAuth = require('../middleware/adminAuth');

// Auth
router.post('/login', superAdminController.login);
router.post('/verify-otp', superAdminController.verifyOTP);

// Stats & Config
router.get('/stats', adminAuth, superAdminController.getGlobalStats);
router.patch('/config', adminAuth, superAdminController.updatePlatformConfig);

// Merchant Management
router.get('/merchants', adminAuth, superAdminController.getAllMerchants);
router.patch('/merchant/:id/toggle', adminAuth, superAdminController.toggleMerchantStatus);
router.patch('/restaurants/:id/status', adminAuth, superAdminController.updateMerchantStatus);
router.patch('/restaurants/:id/subscription', adminAuth, superAdminController.updateMerchantSubscription);
router.get('/merchant/:id/details', adminAuth, superAdminController.getMerchantDetails);
router.post('/merchant/:id/impersonate', adminAuth, superAdminController.impersonateMerchant);

// Demo Requests
router.post('/demo-request', superAdminController.createDemoRequest);
router.get('/demo-requests', adminAuth, superAdminController.getAllDemoRequests);
router.patch('/demo-requests/:id', adminAuth, superAdminController.updateDemoRequest);

// Monitoring & Logs
router.get('/logs', adminAuth, superAdminController.getLogs);
router.get('/errors', adminAuth, superAdminController.getErrorLogs);

module.exports = router;
