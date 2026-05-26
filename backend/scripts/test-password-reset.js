require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const email = process.argv[2] || 'hamimesfin@gmail.com';

fetch('http://localhost:5000/api/auth/request-password-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
})
  .then(async (res) => {
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  })
  .catch((err) => console.error('Request failed:', err.message));
