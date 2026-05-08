const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');

// Login-specific rate limiter: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT token (role normalized for consistent roleCheck / middleware)
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET is not configured');
    err.code = 'E_JWT_CONFIG';
    throw err;
  }
  const role =
    user.role != null && String(user.role).trim()
      ? String(user.role).toLowerCase().trim()
      : user.role;
  return jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Unified Login
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    delete user.password_hash;

    // Log successful login
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, 'LOGIN', 'user', user.id, JSON.stringify({ email: user.email, role: user.role }), req.ip]
    );

    // Set httpOnly cookie
    res.cookie('token', token, authCookieOptions);

    res.json({ user, token });
  } catch (error) {
    console.error('Unified login error:', error);
    if (error && error.code === 'E_JWT_CONFIG') {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Logout - clear cookie
router.post('/logout', (req, res) => {
  // Note: We can't easily get user_id here without authenticateToken middleware
  // If you want to log logouts, add authenticateToken middleware to this route
  res.clearCookie('token', authCookieOptions);
  res.json({ message: 'Logged out successfully' });
});

// Unified Signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['student', 'teacher'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, fullName, role, ...extraFields } = req.body;

  try {
    // Role-specific validation
    if (role === 'student') {
      const { schoolId, disabilityType } = extraFields;
      if (!schoolId || !disabilityType) {
        return res.status(400).json({ error: 'Students must provide schoolId and disabilityType' });
      }
      if (!schoolId.toUpperCase().startsWith('BDU')) {
        return res.status(400).json({ error: 'School ID must start with BDU' });
      }
    } else if (role === 'teacher') {
      const { department } = extraFields;
      if (!department) {
        return res.status(400).json({ error: 'Teachers must provide department' });
      }
      if (!email.toLowerCase().startsWith('edu')) {
        return res.status(400).json({ error: 'Teacher email must start with "edu"' });
      }
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user based on role
    let result;
    if (role === 'student') {
      const { schoolId, disabilityType } = extraFields;
      result = await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name, school_id, disability_type, approval_status)
         VALUES ($1, $2, 'student', $3, $4, $5, 'approved')
         RETURNING id, email, role, full_name, approval_status`,
        [email, passwordHash, fullName, schoolId, disabilityType]
      );
    } else {
      const { department, bio } = extraFields;
      result = await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name, department, bio)
         VALUES ($1, $2, 'teacher', $3, $4, $5)
         RETURNING id, email, role, full_name, department`,
        [email, passwordHash, fullName, department, bio || null]
      );
    }

    const responseData = {
      message: 'Registration successful',
      user: result.rows[0],
      token: generateToken(result.rows[0]),
    };

    // Log successful registration
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [result.rows[0].id, 'REGISTER', 'user', result.rows[0].id, JSON.stringify({ email, role, fullName }), req.ip]
    );

    res.cookie('token', responseData.token, authCookieOptions);
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Unified signup error:', error);
    if (error && error.code === 'E_JWT_CONFIG') {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});


module.exports = router;
