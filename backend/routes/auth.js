const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');
const logger = require('../logger');
const { sendPasswordResetEmail } = require('../utils/mail');

const RESET_CODE_EXPIRY_MINUTES = Number(process.env.RESET_CODE_EXPIRY_MINUTES) || 10;
const RESET_ROLES = ['student', 'teacher'];

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

// Login-specific rate limiter: disabled in development, otherwise 5 attempts per 15 minutes
const loginLimiter = process.env.NODE_ENV === 'development'
  ? (req, res, next) => next()
  : rateLimit({
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

    // Check approval status
    if (user.approval_status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending approval' });
    }
    if (user.approval_status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected' });
    }

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
        `INSERT INTO users (email, password_hash, role, full_name, department, bio, approval_status)
         VALUES ($1, $2, 'teacher', $3, $4, $5, 'pending')
         RETURNING id, email, role, full_name, department, approval_status`,
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

// Password reset request (students & teachers)
router.post('/request-password-reset', [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(400).json({ success: false, message: first?.msg || 'Invalid email' });
  }

  const { email } = req.body;
  const genericMessage =
    'If an account exists for this email, a verification code has been sent. Check your inbox.';

  try {
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: genericMessage });
    }

    const user = userResult.rows[0];
    if (!RESET_ROLES.includes(user.role)) {
      return res.json({ success: true, message: genericMessage });
    }

    const plainCode = generateResetCode();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [codeHash, expiresAt.toISOString(), user.id]
    );

    logger.info('[password-reset] Code saved', { userId: user.id, email });

    const mailResult = await sendPasswordResetEmail(email, plainCode, RESET_CODE_EXPIRY_MINUTES);

    if (mailResult.sent) {
      logger.info('[password-reset] Email sent', { provider: mailResult.provider, email });
      return res.json({
        success: true,
        message: genericMessage,
        expiresInMinutes: RESET_CODE_EXPIRY_MINUTES,
      });
    }

    // Development: SMTP blocked but code is in DB — show in terminal, allow flow to continue
    if (mailResult.devLogged) {
      return res.json({
        success: true,
        message: genericMessage,
        expiresInMinutes: RESET_CODE_EXPIRY_MINUTES,
        devNote:
          'Email could not be delivered (network/SMTP blocked). Open the backend terminal for your 6-digit code, or add RESEND_API_KEY to .env.',
      });
    }

    return res.status(503).json({
      success: false,
      message: mailResult.error || 'Could not send verification email.',
    });
  } catch (error) {
    logger.error('[password-reset] Request failed', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process password reset request',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
});

// Confirm reset code and update password
router.post('/confirm-password-reset', [
  body('email').isEmail().normalizeEmail(),
  body('code').trim().matches(/^\d{6}$/).withMessage('Verification code must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, newPassword } = req.body;
  const code = String(req.body.code || '').trim().replace(/\s/g, '');

  try {
    const result = await pool.query(
      'SELECT id, role, reset_code, reset_code_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid verification code or email' });
    }

    const user = result.rows[0];

    if (!user.reset_code || !user.reset_code_expires_at) {
      return res.status(400).json({
        success: false,
        message: 'No active reset request. Request a new code from Forgot Password.',
      });
    }

    const expiresAt = new Date(user.reset_code_expires_at);
    if (expiresAt <= new Date()) {
      await pool.query(
        'UPDATE users SET reset_code = NULL, reset_code_expires_at = NULL WHERE id = $1',
        [user.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Request a new code.',
      });
    }

    const codeMatches = await bcrypt.compare(code, user.reset_code);
    if (!codeMatches) {
      return res.status(400).json({ success: false, message: 'Incorrect verification code.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateResult = await pool.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, role',
      [passwordHash, email]
    );

    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [updatedUser.id, 'RESET_PASSWORD', 'user', updatedUser.id, JSON.stringify({ email: updatedUser.email, role: updatedUser.role }), req.ip]
      );
    }

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Confirm password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Legacy direct reset endpoint
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, newPassword } = req.body;

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, role',
      [passwordHash, email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, 'RESET_PASSWORD', 'user', user.id, JSON.stringify({ email: user.email, role: user.role }), req.ip]
      );
    }

    return res.json({ message: 'If the email exists, the password has been reset successfully.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
