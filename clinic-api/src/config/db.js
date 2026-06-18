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

// Set session timezone to Africa/Cairo for all Postgres connections
pool.on('connect', (client) => {
  client.query("SET timezone TO 'Africa/Cairo'").catch(err => {
    console.error('[DB] Failed to set connection timezone to Africa/Cairo:', err);
  });
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
