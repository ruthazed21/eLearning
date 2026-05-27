const fs = require('fs');
const pool = require('./db/connection');

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync('./migrate-add-extracted-text.sql', 'utf8');
    console.log('Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration successful! Added extracted_text and transcript columns to lessons table.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
