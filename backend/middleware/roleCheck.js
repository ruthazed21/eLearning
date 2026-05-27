const pool = require('../db/connection');

const checkRole = (...allowedRoles) => {
  const allowed = allowedRoles.map((r) => String(r).toLowerCase().trim());

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole =
      req.user.role != null && String(req.user.role).trim()
        ? String(req.user.role).toLowerCase().trim()
        : '';

    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    // Teachers must be admin-approved before using teacher-protected API routes.
    if (userRole === 'teacher') {
      try {
        const result = await pool.query(
          'SELECT approval_status FROM users WHERE id = $1',
          [req.user.id]
        );
        const approvalStatus = result.rows[0]?.approval_status;

        if (approvalStatus === 'pending') {
          return res.status(403).json({ error: 'Your account is pending approval' });
        }
        if (approvalStatus === 'rejected') {
          return res.status(403).json({ error: 'Your account has been rejected' });
        }
      } catch (err) {
        console.error('Teacher approval check failed:', err);
        return res.status(500).json({ error: 'Failed to verify account status' });
      }
    }

    next();
  };
};

module.exports = checkRole;
