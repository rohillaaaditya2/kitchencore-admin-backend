const express = require('express');
const router = express.Router();
const PlatformConfig = require('../models/PlatformConfig');
const jwt = require('jsonwebtoken');

// Helper: verify SuperAdmin token
const verifySuperAdmin = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ message: 'No token' }); return false; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    if (decoded.role !== 'SuperAdmin') throw new Error();
    return true;
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
};

// ── PUBLIC: Any merchant can fetch contact config ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    let config = await PlatformConfig.findOne();
    if (!config) config = await PlatformConfig.create({});
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SUPERADMIN: Update contact config ─────────────────────────────────────────
router.put('/', async (req, res) => {
  if (!verifySuperAdmin(req, res)) return;
  try {
    const { phone, whatsapp, email } = req.body;
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    if (phone)    config.phone    = phone.trim();
    if (whatsapp) config.whatsapp = whatsapp.trim().replace(/\D/g, ''); // digits only
    if (email)    config.email    = email.trim();

    await config.save();
    res.json({ message: 'Contact config updated', config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
