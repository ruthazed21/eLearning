require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrate-reset-code-hash.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ migrate-reset-code-hash.sql applied');
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
