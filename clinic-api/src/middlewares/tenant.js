const { pool } = require('../config/db');

/**
 * Middleware that extracts tenant ID from headers or subdomains,
 * validates it, and attaches a schema-scoped PostgreSQL client to req.db
 */
const tenantMiddleware = async (req, res, next) => {
  // Allow bypassing for public/global routes like signup, payments webhook
  if (req.path.startsWith('/api/v1/global') || req.path.startsWith('/api/v1/subscriptions/webhook')) {
    return next();
  }

  let tenantId = req.headers['x-tenant-id'] || req.headers['x-tenant'];
  
  if (!tenantId && req.hostname) {
    const parts = req.hostname.split('.');
    // Match subdomain: revive.api.yourdomain.com -> parts = ['revive', 'api', 'yourdomain', 'com']
    // Or revive.localhost -> parts = ['revive', 'localhost']
    if (parts.length >= 2) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'api' && sub !== 'localhost') {
        tenantId = sub;
      }
    }
  }

  if (!tenantId) {
    return res.status(400).json({ 
      error: 'Tenant context is required. Provide x-tenant-id header or access via tenant subdomain.' 
    });
  }

  tenantId = tenantId.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const schemaName = `tenant_${tenantId}`;

  // Validate tenant in global registry
  try {
    const tenantCheck = await pool.query(
      'SELECT id, status FROM public.tenants WHERE id = $1', 
      [tenantId]
    );

    if (tenantCheck.rowCount === 0) {
      return res.status(404).json({ error: `Tenant '${tenantId}' does not exist.` });
    }

    const tenant = tenantCheck.rows[0];
    if (tenant.status !== 'active') {
      return res.status(403).json({ 
        error: `Tenant '${tenantId}' is suspended or inactive. Please contact support.` 
      });
    }

    // Connect to schema
    const dbClient = await pool.connect();
    await dbClient.query(`SET search_path TO ${schemaName}`);

    // Bind DB client and metadata to request object
    req.db = dbClient;
    req.tenantId = tenant.id;
    req.schemaName = schemaName;

    // Safe release mechanism
    let released = false;
    const releaseClient = () => {
      if (!released) {
        dbClient.release();
        released = true;
      }
    };

    res.on('finish', releaseClient);
    res.on('close', releaseClient);

    next();
  } catch (err) {
    console.error(`[TENANT MIDDLEWARE ERROR] Tenant: ${tenantId}`, err);
    return res.status(500).json({ error: 'Internal server error initializing tenant connection.' });
  }
};

module.exports = tenantMiddleware;
