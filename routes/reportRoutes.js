const express = require('express');
const router = express.Router();
const { getReportsData, exportPDF } = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/data', getReportsData);
router.get('/export', exportPDF);

module.exports = router;
