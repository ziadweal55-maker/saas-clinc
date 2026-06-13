/**
 * Package Sessions Sync Helper
 * Scans a client's payments and redistributes logged sessions across purchased packages.
 */
async function syncPackageSessions(db, clientId) {
  const cid = parseInt(clientId);
  if (isNaN(cid)) return;

  try {
    // 1. Get total sessions logged in database
    const sessionCountRes = await db.query(
      'SELECT COUNT(*) as count FROM Sessions WHERE client_id = $1',
      [cid]
    );
    const sessionCount = parseInt(sessionCountRes.rows[0].count);

    // 2. Fetch all purchased packages
    const packagesRes = await db.query(
      `SELECT id, package_sessions_total 
       FROM Payments 
       WHERE client_id = $1 AND package_sessions_total > 0 
       ORDER BY payment_date ASC, id ASC`,
      [cid]
    );
    const packages = packagesRes.rows;

    // 3. Redistribute sessions
    let remainingSessions = sessionCount;
    for (const pkg of packages) {
      const capacity = parseInt(pkg.package_sessions_total);
      const used = Math.min(remainingSessions, capacity);
      
      await db.query(
        'UPDATE Payments SET package_sessions_used = $1 WHERE id = $2',
        [used, pkg.id]
      );
      remainingSessions -= used;
    }
    console.log(`[Package Sync] Client ${cid}: Synced ${sessionCount} sessions across ${packages.length} packages.`);
  } catch (err) {
    console.error('[Package Sync Error]', err);
    throw err;
  }
}

module.exports = {
  syncPackageSessions
};
