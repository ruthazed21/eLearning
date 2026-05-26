const logger = require('../logger');

/**
 * Ensures users.reset_code can store bcrypt hashes (VARCHAR(255)).
 * Safe to run on every server start.
 */
async function ensureResetSchema(pool) {
  try {
    const col = await pool.query(`
      SELECT character_maximum_length AS max_len
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'reset_code'
    `);

    if (col.rows.length === 0) {
      logger.warn('[schema] users.reset_code column not found — run setup-db or schema.sql');
      return;
    }

    const maxLen = col.rows[0].max_len;
    if (maxLen !== null && Number(maxLen) >= 60) {
      logger.debug('[schema] users.reset_code column OK', { maxLen });
      return;
    }

    await pool.query('ALTER TABLE users ALTER COLUMN reset_code TYPE VARCHAR(255)');
    logger.info('[schema] Expanded users.reset_code to VARCHAR(255) for password reset hashes');
  } catch (err) {
    logger.error('[schema] Failed to ensure reset_code column', {
      error: err.message,
      code: err.code,
      stack: err.stack,
    });
    throw err;
  }
}

module.exports = { ensureResetSchema };
