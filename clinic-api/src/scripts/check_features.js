const { Pool } = require('pg');
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: '/home/zyad/saas-clinc/clinic-api/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function main() {
  try {
    const res = await pool.query('SELECT id, name, status, features FROM public.tenants');
    console.log('--- Tenants Features ---');
    res.rows.forEach(row => {
      console.log(`Tenant: ${row.id} (${row.name})`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Features:`, row.features);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
