/**
 * Test SMTP verify() with current .env settings.
 * Run: node scripts/verify-smtp.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { logSmtpEnvOnBoot, verifyMailConnection, resetTransporter } = require('../utils/mail');

async function main() {
  resetTransporter();
  logSmtpEnvOnBoot();
  console.log('\nCalling transporter.verify()...\n');
  await verifyMailConnection();
  console.log('\n✓ SMTP verify succeeded\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ SMTP verify failed:', err.message);
  if (err.code) console.error('  code:', err.code);
  process.exit(1);
});
