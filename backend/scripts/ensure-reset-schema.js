require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../db/connection');
const { ensureResetSchema } = require('../utils/ensureResetSchema');

ensureResetSchema(pool)
  .then(() => {
    console.log('Done.');
    return pool.end();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
