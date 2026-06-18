const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('[FATAL] JWT_SECRET environment variable is missing. Server cannot start.');

/**
 * Authentication middleware that verifies JWT and enforces tenant context matching
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, branchId, tenantId }

    // Override branchId if client sent x-branch-id header
    const clientBranchId = req.headers['x-branch-id'];
    if (clientBranchId && (req.user.role === 'admin' || req.user.role === 'cfo')) {
      req.user.branchId = parseInt(clientBranchId) || 1;
    }

    // CRITICAL: Prevent cross-tenant token spoofing
    // Ensure the token's tenant matches the requested tenant context
    if (req.tenantId && req.user.tenantId !== req.tenantId) {
      return res.status(403).json({ 
        error: 'Forbidden. Token is not valid for this tenant context.' 
      });
    }

    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Authorization role check helper
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Unauthorized. Insufficient permissions.' });
    }
    next();
  }
};

module.exports = {
  authMiddleware,
  authorize,
  JWT_SECRET
};
