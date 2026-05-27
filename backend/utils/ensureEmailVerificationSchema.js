const logger = require('../logger');

/**
 * Creates (idempotently) the table used for 2-step signup email ownership verification.
 * This avoids requiring manual migrations for existing deployments.
 */
async function ensureEmailVerificationSchema(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_signups (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),

        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,

        school_id VARCHAR(50),
        disability_type VARCHAR(100),

        department VARCHAR(100),
        bio TEXT,

        client_key VARCHAR(64) NOT NULL,

        verification_nonce VARCHAR(64) NOT NULL,
        verification_expires_at TIMESTAMP NOT NULL,

        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'verified', 'expired', 'cancelled')),

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,

        user_id INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_email_verification_signups_email_status
        ON email_verification_signups(email, status);
    `);

    // Signup email ownership flag on users (set true only after magic-link verification).
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
    `);
  } catch (err) {
    logger.error('[schema] Failed to ensure email verification schema', {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    // If triggers/function don't exist, it is still safe to proceed without them.
    // The table/columns are created above regardless.
    if (String(err.message || '').includes('update_updated_at_column')) return;
    throw err;
  }
}

module.exports = { ensureEmailVerificationSchema };

