const { Client } = require('pg');

const passwords = ['postgres', 'admin', 'root', '123456', 'password', ''];

async function testPasswords() {
  for (const pwd of passwords) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pwd,
      database: 'postgres'
    });
    try {
      await client.connect();
      console.log('SUCCESS with password:', pwd);
      await client.end();
      return;
    } catch (err) {
      // ignore
    }
  }
  console.log('ALL FAILED');
}
testPasswords();
