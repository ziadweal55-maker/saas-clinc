const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '/home/zyad/saas-clinc/clinic-api/.env' });

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'super_admin_dashboard_secret_key_8847291';

// Generate token
const token = jwt.sign(
  { id: 1, email: 'admin@saasclinic.com', name: 'Super Admin' },
  ADMIN_JWT_SECRET,
  { expiresIn: '12h' }
);

console.log('Generated Admin JWT Token:', token);

// Fetch usage data from local API
const url = 'http://127.0.0.1:3000/api/v1/admin/tenants/newtestt/usage';
const historyUrl = 'http://127.0.0.1:3000/api/v1/admin/tenants/newtestt/history';

async function test() {
  try {
    console.log(`\nFetching usage from: ${url}`);
    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    let data = await response.json();
    console.log('Usage API Response:', JSON.stringify(data, null, 2));

    console.log(`\nFetching history from: ${historyUrl}`);
    response = await fetch(historyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    data = await response.json();
    console.log('History API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
