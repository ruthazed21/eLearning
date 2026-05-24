require('dotenv').config();
const pool = require('./db/connection');

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB connected:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  }
}

test();
