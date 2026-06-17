const { Pool } = require('pg');
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: '/home/zyad/saas-clinc/clinic-api/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function main() {
  try {
    const schemasRes = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `);
    console.log('--- Database Schemas ---');
    for (const row of schemasRes.rows) {
      console.log(`Schema: ${row.schema_name}`);
      const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [row.schema_name]);
      const tables = tablesRes.rows.map(t => t.table_name);
      console.log(`  Tables: ${tables.join(', ') || '(none)'}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
