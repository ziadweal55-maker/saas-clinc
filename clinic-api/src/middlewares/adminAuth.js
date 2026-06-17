const jwt = require('jsonwebtoken');
require('dotenv').config();

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_fallback_secret';

// Verify the admin JWT issued by our own login endpoint
const adminAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Verify using our own ADMIN_JWT_SECRET (issued on our login endpoint)
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    // Attach admin info to request
    req.admin = decoded; // { email, name, id }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token.' });
  }
};

module.exports = { adminAuthMiddleware, ADMIN_JWT_SECRET };
