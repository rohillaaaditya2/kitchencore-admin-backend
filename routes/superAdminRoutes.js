const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

router.get('/stats', adminAuth, superAdminController.getGlobalStats);
router.patch('/config', adminAuth, superAdminController.updatePlatformConfig);

module.exports = router;
