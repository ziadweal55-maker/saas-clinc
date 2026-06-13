const { pool } = require('../config/db');
const { createTenantSchema } = require('../scripts/migrate');
const bcrypt = require('bcryptjs');

const hashPassword = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

/**
 * Register a new tenant (SaaS Signup)
 * Body: { tenantId, clinicName, email, password, logoUrl, primaryColor, whatsappNumber }
 */
exports.registerTenant = async (req, res) => {
  const { tenantId, clinicName, email, password, logoUrl, primaryColor, whatsappNumber } = req.body;

  if (!tenantId || !clinicName || !email || !password) {
    return res.status(400).json({ error: 'tenantId, clinicName, email, and password are required' });
  }

  const cleanTenantId = tenantId.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if tenantId already exists in global registry
    const checkExist = await client.query('SELECT 1 FROM public.tenants WHERE id = $1', [cleanTenantId]);
    if (checkExist.rowCount > 0) {
      return res.status(400).json({ error: `Subdomain/tenant ID '${cleanTenantId}' is already taken.` });
    }

    // 2. Insert into public.tenants registry
    // status is 'active' for default setup (can be modified later to integrate paymob payment checkout screen)
    await client.query(
      `INSERT INTO public.tenants (id, name, logo_url, primary_color, whatsapp_number, status) 
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [cleanTenantId, clinicName, logoUrl || null, primaryColor || '#C8102E', whatsappNumber || null]
    );

    // 3. Create Subscription entry (trial / active)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // 30-day trial

    await client.query(
      `INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
       VALUES ($1, 'starter', 'active', $2, $3)`,
      [cleanTenantId, startDate, endDate]
    );

    await client.query('COMMIT');
    client.release();

    // 4. Provision the database schema for the new tenant
    await createTenantSchema(cleanTenantId);

    // 5. Create initial administrator user inside the new tenant schema
    const tenantDbClient = await pool.connect();
    try {
      const schemaName = `tenant_${cleanTenantId}`;
      await tenantDbClient.query(`SET search_path TO ${schemaName}`);

      const hashedPassword = hashPassword(password);
      
      // Insert first admin user
      await tenantDbClient.query(
        `INSERT INTO Users (username, password_hash, role, status, branch_id) 
         VALUES ($1, $2, 'admin', 'active', 1)`,
        [email.trim(), hashedPassword]
      );
      
      console.log(`[TENANT PROVISION] Successfully created admin user '${email}' in schema '${schemaName}'`);
    } finally {
      tenantDbClient.release();
    }

    return res.json({ 
      success: true, 
      message: `Tenant '${cleanTenantId}' provisioned successfully. You can now log in.`,
      subdomain: cleanTenantId
    });
  } catch (error) {
    // If anything fails, rollback transaction if client is still active
    try {
      await client.query('ROLLBACK');
    } catch(e) {}
    client.release();
    
    console.error('[TENANT CONTROLLER] Signup and provisioning failed:', error);
    return res.status(500).json({ error: `Provisioning failed: ${error.message}` });
  }
};

/**
 * Get Tenant settings & themes (public route, loaded on UI init)
 */
exports.getTenantSettings = async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || req.headers['x-tenant'] || req.hostname.split('.')[0];
  const cleanTenantId = tenantId.toLowerCase().replace(/[^a-z0-9_]/g, '');

  try {
    const result = await pool.query(
      'SELECT id, name, logo_url, primary_color, whatsapp_number, status FROM public.tenants WHERE id = $1',
      [cleanTenantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tenant settings not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[TENANT CONTROLLER] Error fetching settings:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Paymob Subscriptions Webhook Handler
 */
exports.paymobWebhook = async (req, res) => {
  const payload = req.body;
  
  console.log('[PAYMOB WEBHOOK] Received payload:', JSON.stringify(payload, null, 2));
  
  // Paymob Webhook integration logic:
  // 1. Validate signature using HMAC (using Paymob HMAC secret in env)
  // 2. Identify transaction details (obj.success, obj.order.id, obj.order.merchant_order_id, etc.)
  // 3. Update subscription table: active/unpaid status, update billing dates
  
  try {
    // Paymob sends transaction details inside obj
    const transaction = payload.obj;
    if (!transaction) {
      return res.status(400).send('Invalid webhook structure');
    }

    const success = transaction.success;
    const orderId = transaction.order.id;
    const merchantOrderId = transaction.order.merchant_order_id; // Usually mapped to tenantId when creating the payment link

    if (merchantOrderId && success) {
      const cleanTenantId = merchantOrderId.toLowerCase().split('_')[0]; // Extract tenantId from prefix if any

      // Update public subscription record
      const checkSub = await pool.query('SELECT 1 FROM public.tenants WHERE id = $1', [cleanTenantId]);
      if (checkSub.rowCount > 0) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + 1); // 1-month billing cycle

        await pool.query(
          `UPDATE public.subscriptions 
           SET status = 'active', current_period_start = $1, current_period_end = $2, paymob_order_id = $3
           WHERE tenant_id = $4`,
          [startDate, endDate, orderId, cleanTenantId]
        );

        // Reactivate tenant status in registry if suspended
        await pool.query(
          `UPDATE public.tenants SET status = 'active' WHERE id = $1`,
          [cleanTenantId]
        );

        console.log(`[PAYMOB WEBHOOK] Tenant subscription renewed: ${cleanTenantId}`);
      }
    }

    // Always respond 200 OK to Paymob to acknowledge receipt
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[PAYMOB WEBHOOK ERROR]', error);
    return res.status(500).send('Webhook Processing Error');
  }
};
