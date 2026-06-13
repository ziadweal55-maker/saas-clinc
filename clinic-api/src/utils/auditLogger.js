/**
 * Helper to record actions in the AuditLogs table
 */
async function logAudit(db, clientId, field, oldValue, newValue, adminUsername) {
  try {
    await db.query(
      `INSERT INTO AuditLogs (client_id, changed_field, old_value, new_value, admin_username)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        clientId, 
        field, 
        oldValue !== null && oldValue !== undefined ? String(oldValue) : '', 
        newValue !== null && newValue !== undefined ? String(newValue) : '', 
        adminUsername || 'system'
      ]
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

module.exports = {
  logAudit
};
