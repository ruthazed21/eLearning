const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);
    console.log('✓ Database schema created successfully');

    // Create default admin user with hashed password
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'admin@eduaccess.com'`,
      [adminPassword]
    );
    console.log('✓ Default admin user created');
    console.log('  Email: admin@eduaccess.com');
    console.log('  Password: admin123');

    console.log('\nDatabase setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
