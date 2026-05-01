const checkRole = (...allowedRoles) => {
  const allowed = allowedRoles.map((r) => String(r).toLowerCase().trim());

  return (req, res, next) => {
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

    next();
  };
};

module.exports = checkRole;
