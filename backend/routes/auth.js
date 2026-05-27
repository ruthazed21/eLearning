const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../db/connection');
const logger = require('../logger');
const { sendPasswordResetEmail, sendEmailVerificationEmail } = require('../utils/mail');

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
      max: 15,
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

// ---------------------------------------------------------------------------
// Email verification (signup-only, before account creation)
// ---------------------------------------------------------------------------
const SIGNUP_VERIFICATION_EXPIRY_MINUTES =
  Number(process.env.SIGNUP_VERIFICATION_EXPIRY_MINUTES) ||
  Number(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES) ||
  30;

const SIGNUP_VERIFICATION_JWT_SECRET =
  (process.env.SIGNUP_VERIFICATION_JWT_SECRET || process.env.EMAIL_VERIFICATION_JWT_SECRET || '').trim();

const EMAIL_VERIFICATION_BASE_URL =
  (process.env.EMAIL_VERIFICATION_BASE_URL || process.env.BACKEND_URL || 'http://localhost:5000').trim();

function getAllowedBrowserOriginsFromEnv() {
  const raw = String(process.env.FRONTEND_URL || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isAllowedBrowserOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const allowed = getAllowedBrowserOriginsFromEnv();
  if (allowed.length === 0) return false;
  return allowed.includes(origin);
}

// Lightweight CSRF mitigation: only accept browser POSTs from allowed origins.
// Note: this does not affect non-browser clients (curl/Postman) that omit Origin/Referer.
function requireAllowedOrigin(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // If a browser sends Origin, enforce it strictly.
  if (origin) {
    if (!isAllowedBrowserOrigin(origin)) {
      return res.status(403).json({ error: 'Blocked origin' });
    }
    return next();
  }

  // If Origin is absent but Referer exists, allow only when it begins with an allowed origin.
  if (referer && typeof referer === 'string') {
    const allowed = getAllowedBrowserOriginsFromEnv();
    const ok = allowed.some((a) => referer.startsWith(a));
    if (!ok) {
      return res.status(403).json({ error: 'Blocked origin' });
    }
  }

  return next();
}

function requireVerificationSecret() {
  if (!SIGNUP_VERIFICATION_JWT_SECRET) {
    const err = new Error('Email verification secret is not configured (SIGNUP_VERIFICATION_JWT_SECRET / EMAIL_VERIFICATION_JWT_SECRET)');
    err.code = 'E_EMAIL_VERIFICATION_SECRET';
    throw err;
  }
}

function generateVerificationId() {
  // Non-guessable ID for the DB record.
  return crypto.randomBytes(24).toString('hex'); // 48 chars
}

function generateVerificationNonce() {
  // Rotated on resend so old links become invalid.
  return crypto.randomBytes(24).toString('hex');
}

function buildVerificationLink(verificationToken) {
  const base = EMAIL_VERIFICATION_BASE_URL.replace(/\/+$/, '');
  return `${base}/api/auth/signup/verify-email?token=${encodeURIComponent(verificationToken)}`;
}

function generateSignupEmailVerificationToken({ verificationId, nonce, email }) {
  requireVerificationSecret();
  return jwt.sign(
    { purpose: 'signup_email_verification', verificationId, nonce, email },
    SIGNUP_VERIFICATION_JWT_SECRET,
    { expiresIn: `${SIGNUP_VERIFICATION_EXPIRY_MINUTES}m` }
  );
}

const signupVerificationEmailLimiter =
  process.env.NODE_ENV === 'development'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        keyGenerator: (req) => {
          const email = String(req.body?.email || '').trim().toLowerCase();
          return email ? `signup_email:${email}:${req.ip}` : `signup_email:${req.ip}`;
        },
        message: { error: 'Too many signup verification requests. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
      });

const resendSignupVerificationLimiter =
  process.env.NODE_ENV === 'development'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3,
        keyGenerator: (req) => {
          const id = String(req.body?.verificationId || '').trim();
          return id ? `signup_resend:${id}:${req.ip}` : `signup_resend:${req.ip}`;
        },
        message: { error: 'Too many resend requests. Please wait and try again.' },
        standardHeaders: true,
        legacyHeaders: false,
      });

const verificationStatusLimiter =
  process.env.NODE_ENV === 'development'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        keyGenerator: (req) => {
          const id = String(req.query?.verificationId || '').trim();
          return id ? `signup_status:${id}:${req.ip}` : `signup_status:${req.ip}`;
        },
        message: { error: 'Too many status checks. Slow down and try again.' },
        standardHeaders: true,
        legacyHeaders: false,
      });

// Logout - clear cookie
router.post('/logout', (req, res) => {
  // Note: We can't easily get user_id here without authenticateToken middleware
  // If you want to log logouts, add authenticateToken middleware to this route
  res.clearCookie('token', authCookieOptions);
  res.json({ message: 'Logged out successfully' });
});

// Signup (2-step, signup-only): send a magic link first; create the user only after verification.
router.post(
  '/signup',
  requireAllowedOrigin,
  signupVerificationEmailLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().notEmpty(),
    body('role').isIn(['student', 'teacher']),
  ],
  async (req, res) => {
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
      }

      // If an account already exists, don't leak whether it's pending/approved.
      const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password up front so we can create the account after email verification.
      const passwordHash = await bcrypt.hash(password, 10);

      let verificationId;
      let clientKey;
      let nonce;
      const expiresAt = new Date(Date.now() + SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Prevent duplicate pending signups: reuse a still-valid pending record for the same email.
        const pending = await client.query(
          `SELECT id, client_key
           FROM email_verification_signups
           WHERE email = $1 AND status = 'pending' AND verification_expires_at > CURRENT_TIMESTAMP
           ORDER BY created_at DESC
           LIMIT 1`,
          [email]
        );

        nonce = generateVerificationNonce();

        if (pending.rows.length > 0) {
          verificationId = pending.rows[0].id;
          clientKey = pending.rows[0].client_key;

          if (role === 'student') {
            const { schoolId, disabilityType } = extraFields;
            await client.query(
              `UPDATE email_verification_signups
               SET role = 'student',
                   password_hash = $1,
                   full_name = $2,
                   school_id = $3,
                   disability_type = $4,
                   department = NULL,
                   bio = NULL,
                   verification_nonce = $5,
                   verification_expires_at = $6,
                   status = 'pending',
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $7`,
              [passwordHash, fullName, schoolId, disabilityType, nonce, expiresAt.toISOString(), verificationId]
            );
          } else {
            const { department, bio } = extraFields;
            await client.query(
              `UPDATE email_verification_signups
               SET role = 'teacher',
                   password_hash = $1,
                   full_name = $2,
                   department = $3,
                   bio = $4,
                   school_id = NULL,
                   disability_type = NULL,
                   verification_nonce = $5,
                   verification_expires_at = $6,
                   status = 'pending',
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $7`,
              [passwordHash, fullName, department, bio || null, nonce, expiresAt.toISOString(), verificationId]
            );
          }
        } else {
          verificationId = generateVerificationId();
          clientKey = crypto.randomBytes(24).toString('hex');

          if (role === 'student') {
            const { schoolId, disabilityType } = extraFields;
            await client.query(
              `INSERT INTO email_verification_signups
                (id, email, role, password_hash, full_name, school_id, disability_type, department, bio, client_key, verification_nonce, verification_expires_at, status)
               VALUES
                ($1, $2, 'student', $3, $4, $5, $6, NULL, NULL, $7, $8, $9, 'pending')`,
              [verificationId, email, passwordHash, fullName, schoolId, disabilityType, clientKey, nonce, expiresAt.toISOString()]
            );
          } else {
            const { department, bio } = extraFields;
            await client.query(
              `INSERT INTO email_verification_signups
                (id, email, role, password_hash, full_name, school_id, disability_type, department, bio, client_key, verification_nonce, verification_expires_at, status)
               VALUES
                ($1, $2, 'teacher', $3, $4, NULL, NULL, $5, $6, $7, $8, $9, 'pending')`,
              [verificationId, email, passwordHash, fullName, department, bio || null, clientKey, nonce, expiresAt.toISOString()]
            );
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }

      const verificationToken = generateSignupEmailVerificationToken({ verificationId, nonce, email });
      const verificationLink = buildVerificationLink(verificationToken);

      // Send the email. If it fails, tell the user and let them retry (resend/signup again).
      await sendEmailVerificationEmail(email, verificationLink, SIGNUP_VERIFICATION_EXPIRY_MINUTES);

      return res.status(202).json({
        message: 'Check your email to verify your address before creating the account.',
        verificationRequired: true,
        verificationId,
        clientKey,
        expiresInMinutes: SIGNUP_VERIFICATION_EXPIRY_MINUTES,
        email,
        role,
      });
    } catch (error) {
      console.error('Signup email verification error:', error);
      if (error && error.code === 'E_EMAIL_VERIFICATION_SECRET') {
        return res.status(500).json({ error: 'Server misconfiguration: email verification secret is not set' });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// GET /api/auth/signup/verify-email?token=... — called by the email magic link.
router.get('/signup/verify-email', async (req, res) => {
  const token = String(req.query?.token || '').trim();
  if (!token) return res.status(400).send('Missing token');

  try {
    requireVerificationSecret();
    const decoded = jwt.verify(token, SIGNUP_VERIFICATION_JWT_SECRET);

    if (!decoded || typeof decoded !== 'object' || decoded.purpose !== 'signup_email_verification') {
      return res.status(400).send('Invalid verification token');
    }

    const verificationId = String(decoded.verificationId || '').trim();
    const nonce = String(decoded.nonce || '').trim();
    const email = String(decoded.email || '').trim();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const recordRes = await client.query(
        `SELECT id, email, role, password_hash, full_name,
                school_id, disability_type, department, bio,
                client_key, verification_nonce, verification_expires_at, status
         FROM email_verification_signups
         WHERE id = $1
         FOR UPDATE`,
        [verificationId]
      );

      if (recordRes.rows.length === 0) {
        await client.query('ROLLBACK').catch(() => {});
        return res.status(404).send('Verification request not found');
      }

      const record = recordRes.rows[0];

      if (String(record.email).toLowerCase() !== email.toLowerCase()) {
        await client.query('ROLLBACK').catch(() => {});
        return res.status(400).send('Verification token does not match this email');
      }

      if (record.status !== 'pending') {
        await client.query('COMMIT').catch(() => {});
        return res.status(200).send('Email verification already completed.');
      }

      if (record.verification_expires_at <= new Date()) {
        await client.query(
          `UPDATE email_verification_signups
           SET status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [verificationId]
        );
        await client.query('COMMIT');
        return res.status(400).send('Verification link has expired. You can request a new one from the signup page.');
      }

      if (String(record.verification_nonce) !== nonce) {
        await client.query('ROLLBACK').catch(() => {});
        return res.status(400).send('Verification token is no longer valid (it may have been resent).');
      }

      // Create the user only after successful verification.
      const approvalStatus = record.role === 'student' ? 'approved' : 'pending';

      let createdUserId;
      try {
        if (record.role === 'student') {
          const insertRes = await client.query(
            `INSERT INTO users (email, password_hash, role, full_name, school_id, disability_type, approval_status, email_verified)
             VALUES ($1, $2, 'student', $3, $4, $5, $6, true)
             RETURNING id`,
            [
              record.email,
              record.password_hash,
              record.full_name,
              record.school_id,
              record.disability_type,
              approvalStatus,
            ]
          );
          createdUserId = insertRes.rows[0].id;
        } else {
          // Teachers: email_verified=true after magic link; approval_status stays pending until admin acts.
          const insertRes = await client.query(
            `INSERT INTO users (email, password_hash, role, full_name, department, bio, approval_status, email_verified)
             VALUES ($1, $2, 'teacher', $3, $4, $5, $6, true)
             RETURNING id`,
            [record.email, record.password_hash, record.full_name, record.department, record.bio, approvalStatus]
          );
          createdUserId = insertRes.rows[0].id;
        }
      } catch (err) {
        // Duplicate email (race) — re-use existing user.
        if (err && err.code === '23505') {
          const existing = await client.query('SELECT id FROM users WHERE email = $1', [record.email]);
          if (existing.rows.length === 0) throw err;
          createdUserId = existing.rows[0].id;
        } else {
          throw err;
        }
      }

      await client.query(
        `UPDATE email_verification_signups
         SET status = 'verified',
             verified_at = CURRENT_TIMESTAMP,
             user_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [createdUserId, verificationId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Email verified</title>
        </head>
        <body style="font-family: system-ui, Arial, sans-serif; padding: 24px; line-height: 1.4;">
          <h1 style="margin: 0 0 12px;">Email verified</h1>
          <p>Your email verification link was accepted. Return to the signup page — teacher accounts still require administrator approval before dashboard access.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(400).send('Invalid or expired verification token');
  }
});

// GET /api/auth/signup/verification-status?verificationId=...&clientKey=...
// Used by the signup page to poll and continue onboarding only after verification succeeds.
router.get(
  '/signup/verification-status',
  verificationStatusLimiter,
  [
    query('verificationId').trim().notEmpty(),
    query('clientKey').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const verificationId = String(req.query.verificationId || '').trim();
    const clientKey = String(req.query.clientKey || '').trim();

    try {
      const recordRes = await pool.query(
        `SELECT id, email, role, status, user_id, verification_expires_at
         FROM email_verification_signups
         WHERE id = $1 AND client_key = $2`,
        [verificationId, clientKey]
      );

      if (recordRes.rows.length === 0) {
        return res.status(404).json({ verified: false, status: 'not_found' });
      }

      const record = recordRes.rows[0];
      const now = new Date();

      if (record.status !== 'pending') {
        if (record.status === 'verified' && record.user_id) {
          const userRes = await pool.query(
            `SELECT id, email, role, full_name, approval_status, email_verified,
                    school_id, disability_type, department, bio
             FROM users
             WHERE id = $1`,
            [record.user_id]
          );

          if (userRes.rows.length === 0) {
            return res.status(500).json({ verified: false, status: 'user_missing' });
          }

          const user = userRes.rows[0];

          // Teachers: email is verified, but do not issue a session until admin approves.
          if (user.role === 'teacher' && user.approval_status === 'pending') {
            return res.json({
              verified: true,
              status: 'verified',
              emailVerified: true,
              approvalPending: true,
              user,
            });
          }

          if (user.role === 'teacher' && user.approval_status === 'rejected') {
            return res.json({
              verified: true,
              status: 'verified',
              emailVerified: true,
              approvalRejected: true,
              user,
            });
          }

          const token = generateToken(user);
          res.cookie('token', token, authCookieOptions);
          return res.json({ verified: true, status: 'verified', emailVerified: true, user, token });
        }

        return res.json({ verified: false, status: record.status });
      }

      // pending
      if (record.verification_expires_at <= now) {
        // Mark as expired so the UI can show the right message.
        await pool.query(
          `UPDATE email_verification_signups
           SET status = 'expired', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [verificationId]
        );
        return res.json({ verified: false, status: 'expired' });
      }

      return res.json({
        verified: false,
        status: 'pending',
        expiresAt: record.verification_expires_at,
        role: record.role,
      });
    } catch (error) {
      console.error('Signup verification status error:', error);
      return res.status(500).json({ verified: false, status: 'error' });
    }
  }
);

// POST /api/auth/signup/resend-verification { verificationId, clientKey }
router.post(
  '/signup/resend-verification',
  requireAllowedOrigin,
  resendSignupVerificationLimiter,
  [
    body('verificationId').trim().notEmpty(),
    body('clientKey').trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const verificationId = String(req.body.verificationId || '').trim();
    const clientKey = String(req.body.clientKey || '').trim();

    try {
      const recordRes = await pool.query(
        `SELECT id, email, role
         FROM email_verification_signups
         WHERE id = $1 AND client_key = $2 AND status = 'pending'`,
        [verificationId, clientKey]
      );

      if (recordRes.rows.length === 0) {
        return res.status(404).json({ error: 'Verification request not found' });
      }

      const record = recordRes.rows[0];

      const newNonce = generateVerificationNonce();
      const newExpiresAt = new Date(Date.now() + SIGNUP_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

      await pool.query(
        `UPDATE email_verification_signups
         SET verification_nonce = $1,
             verification_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newNonce, newExpiresAt.toISOString(), verificationId]
      );

      const verificationToken = generateSignupEmailVerificationToken({
        verificationId,
        nonce: newNonce,
        email: record.email,
      });

      const verificationLink = buildVerificationLink(verificationToken);
      await sendEmailVerificationEmail(record.email, verificationLink, SIGNUP_VERIFICATION_EXPIRY_MINUTES);

      return res.json({ message: 'Verification link resent.' , expiresInMinutes: SIGNUP_VERIFICATION_EXPIRY_MINUTES});
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
);

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
