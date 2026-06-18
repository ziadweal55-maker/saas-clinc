process.env.TZ = 'Africa/Cairo';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
require('dotenv').config();

const { createGlobalSchema } = require('./scripts/migrate');
const tenantMiddleware = require('./middlewares/tenant');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middlewares
// Allowed origins: all subdomains of production domain + localhost for dev
const ALLOWED_ORIGIN_PATTERN = process.env.ALLOWED_ORIGIN || '';
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server or Postman
    const isLocalhost = /localhost|127\.0\.0\.1/.test(origin);
    const isProd = (ALLOWED_ORIGIN_PATTERN && origin.endsWith(ALLOWED_ORIGIN_PATTERN)) ||
                   origin.endsWith('.vercel.app') ||
                   origin.endsWith('saasclinic.com') ||
                   origin.endsWith('.saasclinic.com');
    if (isLocalhost || isProd) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin not allowed: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global routes (do not require tenant isolation context)
app.use('/api/v1/global', require('./routes/global'));

// Admin dashboard routes (super-admin only, no tenant middleware)
app.use('/api/v1/admin', require('./routes/admin'));

// Tenant isolation context boundary
app.use('/api/v1', tenantMiddleware);

// Schema-scoped API routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/branches', require('./routes/branches'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/doctors', require('./routes/doctors'));
app.use('/api/v1/appointments', require('./routes/appointments'));
app.use('/api/v1/sessions', require('./routes/sessions'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/assessments', require('./routes/assessments'));
app.use('/api/v1/attendance', require('./routes/attendance'));
app.use('/api/v1/exercises', require('./routes/exercises'));
app.use('/api/v1/profiles', require('./routes/profiles'));
app.use('/api/v1/finance', require('./routes/finance'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize server and run global database migrations
const startServer = async () => {
  try {
    console.log('[SERVER] Initializing database...');
    await createGlobalSchema();
    
    app.listen(PORT, () => {
      console.log(`[SERVER] Multi-tenant SaaS API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Activate scheduled jobs
require('./utils/scheduler');
