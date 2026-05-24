const jwt = require('jsonwebtoken');

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;
  const m = authorizationHeader.match(/^Bearer\s+(\S+)/i);
  return m ? m[1].trim() : null;
}

const VALID_ROLES = new Set(['student', 'teacher', 'admin']);

function normalizeUserPayload(decoded) {
  if (!decoded || typeof decoded !== 'object') return null;
  const id =
    typeof decoded.id === 'string' && /^\d+$/.test(decoded.id)
      ? parseInt(decoded.id, 10)
      : decoded.id;
  const roleRaw = decoded.role;
  const role =
    roleRaw != null && String(roleRaw).trim()
      ? String(roleRaw).toLowerCase().trim()
      : '';
  if (!VALID_ROLES.has(role)) {
    return null;
  }
  return {
    ...decoded,
    id,
    role,
  };
}

const authenticateToken = (req, res, next) => {
    const bearerToken = extractBearerToken(req.headers.authorization);
  const cookieToken =
    req.cookies?.token && String(req.cookies.token).trim()
      ? String(req.cookies.token).trim()
      : null;

  // Prefer explicit Authorization bearer tokens over any stale cookie token.
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = normalizeUserPayload(decoded);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
