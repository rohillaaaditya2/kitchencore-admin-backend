const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Support both 'SuperAdmin' and 'superadmin' casing
    const role = decoded.role?.toLowerCase();
    if (role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: SuperAdmin access required.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('[ADMIN AUTH ERROR]', err.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token.' });
  }
};

module.exports = adminAuth;
