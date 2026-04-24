const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const adminAuth = require('../middleware/adminAuth');

router.get('/stats', adminAuth, superAdminController.getGlobalStats);
router.patch('/config', adminAuth, superAdminController.updatePlatformConfig);
router.patch('/merchant/:id/toggle', adminAuth, superAdminController.toggleMerchantStatus);
router.get('/merchant/:id/details', adminAuth, superAdminController.getMerchantDetails);

module.exports = router;
