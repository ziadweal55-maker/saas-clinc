const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');

// Helper to hash password with bcrypt (SaaS standard)
const hashPasswordBcrypt = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

// Legacy SHA256 helper for compatibility
const hashPasswordSha256 = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password, storedHash) => {
  if (storedHash.length === 64) {
    // SHA256 compatibility fallback
    return hashPasswordSha256(password) === storedHash;
  }
  return bcrypt.compareSync(password, storedHash);
};

// Check if any users exist in the current tenant schema
exports.checkUsersExist = async (req, res) => {
  try {
    const result = await req.db.query('SELECT COUNT(*) as count FROM Users');
    const count = parseInt(result.rows[0].count);
    return res.json({ success: true, exists: count > 0 });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error checking user existence:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Setup initial admin account in tenant schema
exports.setupAdmin = async (req, res) => {
  const { username, password, role, doctor_id, branch_id } = req.body;

  try {
    // Check if any users already exist
    const existCheck = await req.db.query('SELECT COUNT(*) as count FROM Users');
    const userCount = parseInt(existCheck.rows[0].count);

    if (userCount > 0) {
      // If users exist, only allow authenticated admins to create new accounts
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ success: false, error: 'Initial setup already completed.' });
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin' || (req.tenantId && decoded.tenantId !== req.tenantId)) {
          return res.status(403).json({ success: false, error: 'Unauthorized. Insufficient permissions.' });
        }
      } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
      }
    }

    const hashedPassword = hashPasswordBcrypt(password);
    const bid = branch_id ? parseInt(branch_id) : (role === 'admin' ? null : 1);

    // Check if username is already taken
    const duplicateCheck = await req.db.query('SELECT id FROM Users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'Username is already taken.' });
    }

    if (role === 'doctor' && doctor_id) {
      await req.db.query("UPDATE Doctors SET status = 'active' WHERE id = $1", [parseInt(doctor_id)]);
    }

    await req.db.query(
      'INSERT INTO Users (username, password_hash, role, doctor_id, branch_id, status) VALUES ($1, $2, $3, $4, $5, \'active\')',
      [username.trim(), hashedPassword, role || 'admin', doctor_id || null, bid]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error setting up admin:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Login user and return JWT
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await req.db.query(
      'SELECT * FROM Users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, error: 'Your account request is pending administrator approval.' });
    }

    if (user.status === 'denied') {
      return res.status(403).json({ success: false, error: 'Your account request has been denied.' });
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ success: false, error: 'This account has been frozen. Please contact the administrator.' });
    }

    if (verifyPassword(password, user.password_hash)) {
      // Create JWT token including tenant context
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          doctor_id: user.doctor_id, 
          branchId: user.branch_id || 1,
          tenantId: req.tenantId
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          doctor_id: user.doctor_id, 
          branch_id: user.branch_id || 1 
        }
      });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error logging in:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Register pending user (doctors/staff signup requests)
exports.registerPendingUser = async (req, res) => {
  const { branchId, role, username, password, firstName, lastName, specialty } = req.body;

  try {
    // 1. Validation
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required and password must be at least 6 characters.' 
      });
    }

    // 2. Check username uniqueness
    const userCheck = await req.db.query(
      'SELECT 1 FROM Users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (userCheck.rowCount > 0) {
      return res.status(400).json({ success: false, error: 'This username is already taken.' });
    }

    // 3. Handle doctor profile creation
    let doctorId = null;
    if (role === 'doctor') {
      if (!firstName || !lastName || !specialty) {
        return res.status(400).json({ 
          success: false, 
          error: 'First name, last name, and specialty are required for doctor profile.' 
        });
      }
      
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      const docCheck = await req.db.query(
        'SELECT 1 FROM Doctors WHERE LOWER(name) = LOWER($1)',
        [fullName]
      );
      if (docCheck.rowCount > 0) {
        return res.status(400).json({ success: false, error: 'A doctor with this name already exists.' });
      }

      const userByNameCheck = await req.db.query(
        'SELECT 1 FROM Users WHERE LOWER(username) = LOWER($1)',
        [fullName]
      );
      if (userByNameCheck.rowCount > 0) {
        return res.status(400).json({ success: false, error: 'The doctor full name conflicts with an existing username.' });
      }

      // Insert pending doctor profile
      const docRes = await req.db.query(
        'INSERT INTO Doctors (name, specialty, status, branch_id) VALUES ($1, $2, \'pending\', $3) RETURNING id',
        [fullName, specialty.trim(), parseInt(branchId) || 1]
      );
      doctorId = docRes.rows[0].id;
    }

    // 4. Hash password and insert pending user
    const hashedPassword = hashPasswordBcrypt(password);
    const bid = parseInt(branchId) || 1;

    await req.db.query(
      'INSERT INTO Users (username, password_hash, role, doctor_id, branch_id, status) VALUES ($1, $2, $3, $4, $5, \'pending\')',
      [username.trim(), hashedPassword, role, doctorId, bid]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error registering pending user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get pending and active accounts lists for admin view
exports.getPendingAccounts = async (req, res) => {
  try {
    const result = await req.db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.status, 
        u.created_at, 
        u.branch_id, 
        b.name as branch_name, 
        d.name as doctor_name, 
        d.specialty as doctor_specialty 
      FROM Users u 
      LEFT JOIN Branches b ON u.branch_id = b.id 
      LEFT JOIN Doctors d ON u.doctor_id = d.id 
      WHERE u.role IN ('doctor', 'staff') AND u.status IN ('pending', 'active', 'denied')
      ORDER BY u.created_at DESC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error fetching pending accounts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Approve user account requests
exports.approveAccountRequest = async (req, res) => {
  const { userId } = req.body;

  try {
    const userQuery = await req.db.query('SELECT role, doctor_id FROM Users WHERE id = $1', [userId]);
    if (userQuery.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userQuery.rows[0];

    await req.db.query('UPDATE Users SET status = \'active\' WHERE id = $1', [userId]);

    if (user.role === 'doctor' && user.doctor_id) {
      await req.db.query('UPDATE Doctors SET status = \'active\' WHERE id = $1', [user.doctor_id]);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error approving account request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Deny user account requests
exports.denyAccountRequest = async (req, res) => {
  const { userId } = req.body;

  try {
    const userQuery = await req.db.query('SELECT role, doctor_id FROM Users WHERE id = $1', [userId]);
    if (userQuery.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userQuery.rows[0];

    await req.db.query('UPDATE Users SET status = \'denied\' WHERE id = $1', [userId]);

    if (user.role === 'doctor' && user.doctor_id) {
      await req.db.query('UPDATE Doctors SET status = \'inactive\' WHERE id = $1', [user.doctor_id]);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error denying account request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get all system users inside tenant schema (Admin only)
exports.getAllUsers = async (req, res) => {
  const branchId = req.user.branchId || 1;
  try {
    const result = await req.db.query(
      `SELECT id, username, role, doctor_id, status, branch_id 
       FROM Users 
       WHERE branch_id = $1 OR branch_id IS NULL OR role = 'admin'`,
      [branchId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error fetching all users:', error);
    return res.status(500).json([]);
  }
};

// Reset a user's password
exports.resetUserPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    const hashedPassword = hashPasswordBcrypt(newPassword);
    await req.db.query('UPDATE Users SET password_hash = $1 WHERE id = $2', [hashedPassword, parseInt(userId)]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete user account
exports.deleteUserAccount = async (req, res) => {
  const { userId } = req.body;
  try {
    const uId = parseInt(userId);
    const userQuery = await req.db.query('SELECT role, doctor_id FROM Users WHERE id = $1', [uId]);
    if (userQuery.rowCount > 0) {
      const user = userQuery.rows[0];
      if (user.role === 'doctor' && user.doctor_id) {
        await req.db.query("UPDATE Doctors SET status = 'inactive' WHERE id = $1", [user.doctor_id]);
      }
    }
    await req.db.query('DELETE FROM Users WHERE id = $1', [uId]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update user status (freeze/unfreeze)
exports.updateUserStatus = async (req, res) => {
  const { userId, status } = req.body;
  try {
    const uId = parseInt(userId);
    await req.db.query('UPDATE Users SET status = $1 WHERE id = $2', [status, uId]);
    
    const userQuery = await req.db.query('SELECT role, doctor_id FROM Users WHERE id = $1', [uId]);
    if (userQuery.rowCount > 0) {
      const user = userQuery.rows[0];
      if (user.role === 'doctor' && user.doctor_id) {
        const doctorStatus = status === 'frozen' ? 'inactive' : 'active';
        await req.db.query("UPDATE Doctors SET status = $1 WHERE id = $2", [doctorStatus, user.doctor_id]);
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[AUTH CONTROLLER] Error updating user status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
