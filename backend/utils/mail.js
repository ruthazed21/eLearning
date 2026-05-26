const nodemailer = require('nodemailer');
const logger = require('../logger');

const DEFAULT_HOST = 'smtp.gmail.com';

/** SMTP profiles to try in order when sending (Gmail) */
const SMTP_FALLBACK_PROFILES = [
  { port: 587, secure: false, label: 'STARTTLS-587' },
  { port: 465, secure: true, label: 'SSL-465' },
];

function getMailCredentials() {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  return { user, pass };
}

function parseSmtpSecureFromEnv() {
  const raw = String(process.env.SMTP_SECURE ?? 'false').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function parseSmtpPortFromEnv() {
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isFinite(port) || port <= 0) return 587;
  return port;
}

function resolvePrimarySmtpSettings() {
  const host = (process.env.SMTP_HOST || DEFAULT_HOST).trim();
  let port = parseSmtpPortFromEnv();
  let secure = parseSmtpSecureFromEnv();

  if (port === 465 && !secure) secure = true;
  if (port === 587 && secure) secure = false;

  return { host, port, secure };
}

function buildSmtpProfiles() {
  const { host, port, secure } = resolvePrimarySmtpSettings();
  const profiles = [{ host, port, secure, label: 'env' }];

  for (const fb of SMTP_FALLBACK_PROFILES) {
    const exists = profiles.some((p) => p.port === fb.port && p.secure === fb.secure);
    if (!exists) {
      profiles.push({ host, ...fb });
    }
  }
  return profiles;
}

function createTransporterForProfile({ host, port, secure }) {
  const { user, pass } = getMailCredentials();
  if (!user || !pass) return null;

  const options = {
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  };

  if (port === 587 && !secure) {
    options.requireTLS = true;
    options.tls = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
  }

  return nodemailer.createTransport(options);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '(not set)';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function isSmtpConfigured() {
  const { user, pass } = getMailCredentials();
  const host = (process.env.SMTP_HOST || DEFAULT_HOST).trim();
  return Boolean(host && user && pass);
}

function isResendConfigured() {
  return Boolean((process.env.RESEND_API_KEY || '').trim());
}

function logSmtpEnvOnBoot() {
  const { user, pass } = getMailCredentials();
  const primary = resolvePrimarySmtpSettings();

  logger.info('[mail] Email configuration', {
    SMTP_HOST: process.env.SMTP_HOST ?? '(default smtp.gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT ?? '(default 587)',
    SMTP_SECURE: process.env.SMTP_SECURE ?? '(default false)',
    resolvedPort: primary.port,
    resolvedSecure: primary.secure,
    credentialUser: maskEmail(user),
    hasPassword: Boolean(pass),
    usesResendApi: isResendConfigured(),
  });
}

function buildResetEmailContent(code, expiryMinutes) {
  const text = `Your password reset code is: ${code}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request a password reset, ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0f0f0f;">Password reset</h2>
      <p>Use this verification code to reset your EduAccess password:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f0f0f;">${code}</p>
      <p style="color: #666;">This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
    </div>
  `;
  return {
    subject: 'EduAccess — Password reset code',
    text,
    html,
  };
}

function getFromAddress() {
  const { user } = getMailCredentials();
  return process.env.EMAIL_FROM || user || 'no-reply@eduaccess.com';
}

/**
 * Send via Resend HTTPS API (port 443) — works when SMTP ports 587/465 are blocked.
 * Free tier: https://resend.com — set RESEND_API_KEY in .env
 */
async function sendViaResend(toEmail, code, expiryMinutes) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  const { subject, text, html } = buildResetEmailContent(code, expiryMinutes);
  const from = getFromAddress();

  logger.info('[mail] Sending via Resend API (HTTPS)', { to: maskEmail(toEmail) });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    let detail = bodyText;
    try {
      detail = JSON.parse(bodyText).message || bodyText;
    } catch {
      /* keep raw */
    }
    throw new Error(`Resend API error: ${detail}`);
  }

  logger.info('[mail] Resend API send succeeded', { to: maskEmail(toEmail) });
  return { sent: true, provider: 'resend' };
}

async function sendViaSmtpProfile(profile, toEmail, mailOptions) {
  const transporter = createTransporterForProfile(profile);
  if (!transporter) {
    throw new Error('SMTP credentials missing (EMAIL_USER / EMAIL_PASS)');
  }

  logger.info('[mail] Trying SMTP', {
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    profile: profile.label,
  });

  const info = await transporter.sendMail(mailOptions);
  logger.info('[mail] SMTP send succeeded', {
    profile: profile.label,
    port: profile.port,
    messageId: info.messageId,
  });
  return { sent: true, provider: 'smtp', profile: profile.label, messageId: info.messageId };
}

async function sendViaSmtpWithFallback(toEmail, code, expiryMinutes) {
  const { user } = getMailCredentials();
  const { subject, text, html } = buildResetEmailContent(code, expiryMinutes);

  const mailOptions = {
    from: getFromAddress(),
    to: toEmail,
    subject,
    text,
    html,
  };

  const profiles = buildSmtpProfiles();
  const errors = [];

  for (const profile of profiles) {
    try {
      return await sendViaSmtpProfile(profile, toEmail, mailOptions);
    } catch (err) {
      errors.push({ profile: profile.label, port: profile.port, message: err.message, code: err.code });
      logger.warn('[mail] SMTP profile failed', errors[errors.length - 1]);
    }
  }

  const summary = errors.map((e) => `${e.profile}:${e.message}`).join('; ');
  const err = new Error(
    `All SMTP attempts failed (${summary}). Your network may block ports 587/465. ` +
      'Use RESEND_API_KEY in .env (HTTPS) or try mobile hotspot / different Wi‑Fi.'
  );
  err.code = 'SMTP_ALL_FAILED';
  err.attempts = errors;
  throw err;
}

function logDevResetCode(toEmail, code, expiryMinutes) {
  console.log('\n========== PASSWORD RESET CODE (email could not be sent) ==========');
  console.log(`Email:   ${toEmail}`);
  console.log(`Code:    ${code}`);
  console.log(`Expires: ${expiryMinutes} minutes`);
  console.log('====================================================================\n');
}

/**
 * Send password reset email — Resend API first, then SMTP with port fallback.
 */
async function sendPasswordResetEmail(toEmail, code, expiryMinutes = 10) {
  // 1) Resend (HTTPS) — best when SMTP is blocked
  if (isResendConfigured()) {
    try {
      return await sendViaResend(toEmail, code, expiryMinutes);
    } catch (err) {
      logger.error('[mail] Resend failed, falling back to SMTP', { error: err.message });
    }
  }

  // 2) SMTP with 587 then 465
  if (isSmtpConfigured()) {
    try {
      return await sendViaSmtpWithFallback(toEmail, code, expiryMinutes);
    } catch (err) {
      logger.error('[mail] SMTP failed', { error: err.message, code: err.code });

      if (process.env.NODE_ENV === 'development') {
        logDevResetCode(toEmail, code, expiryMinutes);
        return {
          sent: false,
          devLogged: true,
          error: err.message,
        };
      }
      throw err;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    logDevResetCode(toEmail, code, expiryMinutes);
    return { sent: false, devLogged: true };
  }

  throw new Error(
    'Email not configured. Set EMAIL_USER + EMAIL_PASS for SMTP, or RESEND_API_KEY for HTTPS delivery.'
  );
}

async function verifyMailConnection() {
  if (isResendConfigured()) {
    logger.info('[mail] Resend API key present — skipping SMTP verify');
    return;
  }

  const profiles = buildSmtpProfiles();
  const errors = [];

  for (const profile of profiles) {
    const transporter = createTransporterForProfile(profile);
    if (!transporter) throw new Error('SMTP credentials missing');
    try {
      await transporter.verify();
      logger.info('[mail] SMTP verify OK', { port: profile.port, secure: profile.secure });
      return;
    } catch (err) {
      errors.push({ profile: profile.label, message: err.message });
    }
  }

  throw new Error(`SMTP verify failed: ${JSON.stringify(errors)}`);
}

function getSmtpStatusForLogs() {
  const primary = resolvePrimarySmtpSettings();
  const { user } = getMailCredentials();
  return {
    configured: isSmtpConfigured(),
    resend: isResendConfigured(),
    host: primary.host,
    port: primary.port,
    secure: primary.secure,
    user: maskEmail(user),
  };
}

module.exports = {
  isSmtpConfigured,
  isResendConfigured,
  verifyMailConnection,
  sendPasswordResetEmail,
  getSmtpStatusForLogs,
  logSmtpEnvOnBoot,
  getMailCredentials,
};
