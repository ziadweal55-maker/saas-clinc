const { Pool } = require('pg');
require('dotenv').config();

let baseConnectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'clinic_password_992'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'clinic_saas'}`;

// Dynamically append options to enforce Africa/Cairo timezone at connection level
const separator = baseConnectionString.includes('?') ? '&' : '?';
const connectionString = `${baseConnectionString}${separator}options=-c%20timezone=Africa/Cairo`;

console.log('[DB] Connecting to:', connectionString.replace(/:[^:@\n]+@/, ':***@')); // Obfuscate password in logs

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 3 // Limit pool size for Neon free tier compatibility
});

// Note: Session timezone is already set to Africa/Cairo at connection level via connectionString options.

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
