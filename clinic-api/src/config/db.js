const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'clinic_password_992'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'clinic_saas'}`,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
