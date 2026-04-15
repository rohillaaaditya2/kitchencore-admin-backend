const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pizza_super_secret_123';

exports.login = (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  
  if (username === 'admin' && password === '123456') {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
};
