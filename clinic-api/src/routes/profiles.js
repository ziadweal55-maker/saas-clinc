const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middlewares/auth');
const { logAudit } = require('../utils/auditLogger');
const cloudinary = require('cloudinary').v2;

// Initialize Cloudinary if credentials exist
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                              process.env.CLOUDINARY_API_KEY && 
                              process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('[CLOUDINARY] Cloudinary configured successfully.');
} else {
  console.warn('[CLOUDINARY] Warning: Cloudinary is not configured. Falling back to local storage.');
}

async function uploadBase64ToCloudinary(base64Data, subfolder, tenantId) {
  let uploadData = base64Data;
  if (!base64Data.startsWith('data:')) {
    uploadData = `data:image/jpeg;base64,${base64Data}`;
  }
  const folderPath = `saas-clinic/${tenantId}/${subfolder}`;
  const uploadResult = await cloudinary.uploader.upload(uploadData, {
    folder: folderPath,
    resource_type: 'auto'
  });
  return uploadResult.secure_url;
}

// Helper to decode base64 file and save to local disk
function saveBase64File(base64Data, originalName, subfolder, tenantId) {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let base64Body = base64Data;
  if (matches && matches.length === 3) {
    base64Body = matches[2];
  }
  
  const buffer = Buffer.from(base64Body, 'base64');
  
  const ext = path.extname(originalName) || '.bin';
  const basename = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${basename}_${Date.now()}${ext}`;
  
  const targetDir = path.join(__dirname, '../../uploads', tenantId, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);
  
  // Return the path prefix that Express static middleware serves
  return `/uploads/${tenantId}/${subfolder}/${filename}`;
}

// 1. GET client profiles
router.get('/client/:clientId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM ClientProfiles WHERE client_id = $1 ORDER BY created_at DESC', 
      [parseInt(req.params.clientId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching client profiles:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. GET single profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM ClientProfiles WHERE id = $1', 
      [parseInt(req.params.id)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching profile:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. POST create profile
router.post('/', authMiddleware, async (req, res) => {
  const { client_id, profile_type, name } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO ClientProfiles (client_id, profile_type, name) VALUES ($1, $2, $3) RETURNING id',
      [parseInt(client_id), profile_type, name]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error creating profile:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. DELETE client profile
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM ClientProfiles WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting profile:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. PATCH client profile height
router.patch('/:id/height', authMiddleware, async (req, res) => {
  const { height } = req.body;
  try {
    await req.db.query(
      'UPDATE ClientProfiles SET height = $1 WHERE id = $2', 
      [height ? parseFloat(height) : null, parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error updating height:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 6. GET PT Red Flags
router.get('/pt/red-flags/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM PTRedFlags WHERE profile_id = $1', 
      [parseInt(req.params.profileId)]
    );
    if (result.rowCount === 0) {
      return res.json({ flags: '', other_text: '' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching red flags:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 7. POST save PT Red Flags
router.post('/pt/red-flags/:profileId', authMiddleware, async (req, res) => {
  const { flags, other_text, doctor_id } = req.body;
  const profileId = parseInt(req.params.profileId);
  try {
    const existing = await req.db.query('SELECT id FROM PTRedFlags WHERE profile_id = $1', [profileId]);
    if (existing.rowCount > 0) {
      await req.db.query(
        'UPDATE PTRedFlags SET flags = $1, other_text = $2, doctor_id = $3, updated_at = NOW() WHERE profile_id = $4',
        [flags, other_text, doctor_id || null, profileId]
      );
    } else {
      await req.db.query(
        'INSERT INTO PTRedFlags (profile_id, flags, other_text, doctor_id, updated_at) VALUES ($1, $2, $3, $4, NOW())',
        [profileId, flags, other_text, doctor_id || null]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving red flags:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 8. GET PT Subjective (latest or specific subjective ID)
router.get('/pt/subjective/:profileId', authMiddleware, async (req, res) => {
  const { assessmentId } = req.query;
  const profileId = parseInt(req.params.profileId);
  try {
    let result;
    if (assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null') {
      result = await req.db.query('SELECT * FROM PTSubjective WHERE id = $1', [parseInt(assessmentId)]);
    } else {
      result = await req.db.query(
        'SELECT * FROM PTSubjective WHERE profile_id = $1 ORDER BY updated_at DESC LIMIT 1', 
        [profileId]
      );
    }
    if (result.rowCount === 0) {
      return res.json({ chief_complaint: '', aggravating: '', easing: '', irritability: '', nature: '' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching subjective:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 9. GET all PT Subjectives list
router.get('/pt/subjectives/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM PTSubjective WHERE profile_id = $1 ORDER BY updated_at DESC', 
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching subjectives list:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 10. POST save PT Subjective
router.post('/pt/subjective/:profileId', authMiddleware, async (req, res) => {
  const { id, chief_complaint, aggravating, easing, irritability, irritability_notes, nature, nature_notes, pain_scale, doctor_id } = req.body;
  const profileId = parseInt(req.params.profileId);
  try {
    if (id) {
      await req.db.query(
        `UPDATE PTSubjective SET 
          chief_complaint = $1, aggravating = $2, easing = $3, irritability = $4, irritability_notes = $5,
          nature = $6, nature_notes = $7, pain_scale = $8, doctor_id = $9, updated_at = NOW()
         WHERE id = $10`,
        [chief_complaint, aggravating, easing, irritability, irritability_notes || null, nature, nature_notes || null, pain_scale, doctor_id || null, parseInt(id)]
      );
      return res.json({ success: true, id });
    } else {
      const result = await req.db.query(
        `INSERT INTO PTSubjective (
          profile_id, chief_complaint, aggravating, easing, irritability, irritability_notes, 
          nature, nature_notes, pain_scale, doctor_id, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
        [profileId, chief_complaint, aggravating, easing, irritability, irritability_notes || null, nature, nature_notes || null, pain_scale, doctor_id || null]
      );
      return res.json({ success: true, id: result.rows[0].id });
    }
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving subjective:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 11. DELETE PT Subjective assessment
router.delete('/pt/assessment/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM PTSubjective WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting subjective assessment:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 12. GET PT Objective rows
router.get('/pt/objective-rows/:profileId', authMiddleware, async (req, res) => {
  const { subjectiveId } = req.query;
  try {
    const result = await req.db.query(
      'SELECT * FROM PTObjectiveRows WHERE profile_id = $1 AND subjective_id = $2 ORDER BY sort_order ASC',
      [parseInt(req.params.profileId), subjectiveId ? parseInt(subjectiveId) : null]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching objective rows:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 13. POST save PT Objective rows
router.post('/pt/objective-rows/:profileId', authMiddleware, async (req, res) => {
  const { subjectiveId, rows } = req.body;
  const profileId = parseInt(req.params.profileId);
  const sId = parseInt(subjectiveId);
  try {
    await req.db.query('DELETE FROM PTObjectiveRows WHERE profile_id = $1 AND subjective_id = $2', [profileId, sId]);
    if (Array.isArray(rows)) {
      for (const row of rows) {
        await req.db.query(
          `INSERT INTO PTObjectiveRows (profile_id, subjective_id, row_type, joint_name, pain, limitation, angle, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [profileId, sId, row.row_type, row.joint_name, row.pain, row.limitation, row.angle, row.sort_order || 0]
        );
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving objective rows:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 14. GET PT Palpation notes
router.get('/pt/palpation/:profileId', authMiddleware, async (req, res) => {
  const { subjectiveId } = req.query;
  try {
    const result = await req.db.query(
      'SELECT * FROM PTObjectivePalpation WHERE profile_id = $1 AND subjective_id = $2',
      [parseInt(req.params.profileId), subjectiveId ? parseInt(subjectiveId) : null]
    );
    if (result.rowCount === 0) {
      return res.json({ notes: '' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching palpation:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 15. POST save PT Palpation notes
router.post('/pt/palpation/:profileId', authMiddleware, async (req, res) => {
  const { subjectiveId, notes, doctor_id } = req.body;
  const profileId = parseInt(req.params.profileId);
  const sId = parseInt(subjectiveId);
  try {
    const existing = await req.db.query(
      'SELECT id FROM PTObjectivePalpation WHERE profile_id = $1 AND subjective_id = $2', 
      [profileId, sId]
    );
    if (existing.rowCount > 0) {
      await req.db.query(
        'UPDATE PTObjectivePalpation SET notes = $1, doctor_id = $2, updated_at = NOW() WHERE profile_id = $3 AND subjective_id = $4',
        [notes, doctor_id || null, profileId, sId]
      );
    } else {
      await req.db.query(
        'INSERT INTO PTObjectivePalpation (profile_id, subjective_id, notes, doctor_id, updated_at) VALUES ($1, $2, $3, $4, NOW())',
        [profileId, sId, notes, doctor_id || null]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving palpation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 16. GET PT Special Tests
router.get('/pt/special-tests/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM AssessmentResults WHERE client_id = (SELECT client_id FROM ClientProfiles WHERE id = $1)',
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching special tests:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 17. POST save PT Special Test Result
router.post('/pt/special-test-result', authMiddleware, async (req, res) => {
  const { profileId, testId, result } = req.body;
  try {
    const profileRes = await req.db.query('SELECT client_id FROM ClientProfiles WHERE id = $1', [parseInt(profileId)]);
    if (profileRes.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const clientId = profileRes.rows[0].client_id;
    
    const existing = await req.db.query(
      'SELECT id FROM AssessmentResults WHERE client_id = $1 AND test_id = $2', 
      [clientId, parseInt(testId)]
    );
    if (existing.rowCount > 0) {
      await req.db.query(
        'UPDATE AssessmentResults SET result = $1, created_at = NOW() WHERE client_id = $2 AND test_id = $3',
        [result, clientId, parseInt(testId)]
      );
    } else {
      await req.db.query(
        'INSERT INTO AssessmentResults (client_id, test_id, result, created_at) VALUES ($1, $2, $3, NOW())',
        [clientId, parseInt(testId), result]
      );
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving special test result:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 18. GET PT Session Plans
router.get('/pt/session-plans/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM PTSessionPlan WHERE profile_id = $1 ORDER BY updated_at DESC', 
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching session plans:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 19. POST save PT Session Plan
router.post('/pt/session-plan/:profileId', authMiddleware, async (req, res) => {
  const { id, electrotherapy, manual_therapy, tools, doctor_id } = req.body;
  const profileId = parseInt(req.params.profileId);
  try {
    if (id) {
      await req.db.query(
        `UPDATE PTSessionPlan SET 
          electrotherapy = $1, manual_therapy = $2, tools = $3, doctor_id = $4, updated_at = NOW()
         WHERE id = $5`,
        [electrotherapy, manual_therapy, tools, doctor_id || null, parseInt(id)]
      );
      return res.json({ success: true, id });
    } else {
      const result = await req.db.query(
        `INSERT INTO PTSessionPlan (profile_id, electrotherapy, manual_therapy, tools, doctor_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [profileId, electrotherapy, manual_therapy, tools, doctor_id || null]
      );
      return res.json({ success: true, id: result.rows[0].id });
    }
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving session plan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 20. DELETE PT Session Plan
router.delete('/pt/session-plan/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM PTSessionPlan WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting session plan:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 21. GET Lymphatic measurements
router.get('/lymphatic/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM LymphaticMeasurements WHERE profile_id = $1 ORDER BY session_date DESC, created_at DESC',
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching lymphatic measurements:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 22. POST save Lymphatic measurement
router.post('/lymphatic/:profileId', authMiddleware, async (req, res) => {
  const { measurement_name, value, unit, session_date, doctor_id } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO LymphaticMeasurements (profile_id, measurement_name, value, unit, session_date, doctor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
      [parseInt(req.params.profileId), measurement_name, value, unit || 'cm', session_date || null, doctor_id || null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving lymphatic measurement:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 23. DELETE Lymphatic measurement
router.delete('/lymphatic/measurement/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM LymphaticMeasurements WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting lymphatic measurement:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 24. GET Nutrition history
router.get('/nutrition/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM NutritionMedicalHistory WHERE profile_id = $1 ORDER BY session_date DESC, created_at DESC',
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching nutrition history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 25. POST save Nutrition history
router.post('/nutrition/:profileId', authMiddleware, async (req, res) => {
  const { content, weight, doctor_id, session_date } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO NutritionMedicalHistory (profile_id, content, weight, doctor_id, session_date, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [parseInt(req.params.profileId), content, weight || null, doctor_id || null, session_date || null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error saving nutrition history:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 26. PUT update Nutrition history
router.put('/nutrition/history/:id', authMiddleware, async (req, res) => {
  const { content, weight, doctor_id, session_date } = req.body;
  try {
    await req.db.query(
      `UPDATE NutritionMedicalHistory SET content = $1, weight = $2, doctor_id = $3, session_date = $4 WHERE id = $5`,
      [content, weight || null, doctor_id || null, session_date || null, parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error updating nutrition history:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 27. DELETE Nutrition history
router.delete('/nutrition/history/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM NutritionMedicalHistory WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting nutrition history:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 28. GET Investigation Library
router.get('/investigations/library', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM InvestigationLibrary ORDER BY name ASC');
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching investigation library:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 29. GET Client Investigations
router.get('/investigations/client/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT ci.*, il.name as investigation_name 
       FROM ClientInvestigations ci
       JOIN InvestigationLibrary il ON ci.investigation_id = il.id
       WHERE ci.profile_id = $1
       ORDER BY ci.created_at DESC`,
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching client investigations:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 30. POST assign Client Investigation
router.post('/investigations/assign/:profileId', authMiddleware, async (req, res) => {
  const { investigationId, doctorId } = req.body;
  try {
    const result = await req.db.query(
      `INSERT INTO ClientInvestigations (profile_id, investigation_id, doctor_id, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [parseInt(req.params.profileId), parseInt(investigationId), doctorId ? parseInt(doctorId) : null]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error assigning investigation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 31. DELETE Client Investigation
router.delete('/investigations/client/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM ClientInvestigations WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error removing client investigation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 32. PUT update Client Investigation Result
router.put('/investigations/client/:id', authMiddleware, async (req, res) => {
  const { result_text, result_date } = req.body;
  try {
    await req.db.query(
      `UPDATE ClientInvestigations SET result_text = $1, result_date = $2 WHERE id = $3`,
      [result_text, result_date || null, parseInt(req.params.id)]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error updating client investigation result:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 33. GET Inbody Uploads list
router.get('/inbody/:profileId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM InbodyUploads WHERE profile_id = $1 ORDER BY upload_date DESC', 
      [parseInt(req.params.profileId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching Inbody uploads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 34. POST upload Inbody file
router.post('/inbody/:profileId/upload', authMiddleware, async (req, res) => {
  const { fileName, base64 } = req.body;
  const profileId = parseInt(req.params.profileId);
  const tenantId = req.headers['x-tenant-id'] || 'default';
  try {
    let savedPath;
    if (isCloudinaryConfigured) {
      savedPath = await uploadBase64ToCloudinary(base64, 'inbody', tenantId);
    } else {
      savedPath = saveBase64File(base64, fileName, 'inbody', tenantId);
    }
    
    const result = await req.db.query(
      `INSERT INTO InbodyUploads (profile_id, file_name, local_file_path, session_date, upload_date)
       VALUES ($1, $2, $3, CURRENT_DATE, NOW()) RETURNING id`,
      [profileId, fileName, savedPath]
    );
    
    return res.json({ success: true, id: result.rows[0].id, filePath: savedPath });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error uploading Inbody file:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 35. DELETE Inbody Upload
router.delete('/inbody/upload/:id', authMiddleware, async (req, res) => {
  try {
    const fileRes = await req.db.query('SELECT local_file_path FROM InbodyUploads WHERE id = $1', [parseInt(req.params.id)]);
    if (fileRes.rowCount > 0) {
      const filePath = fileRes.rows[0].local_file_path;
      if (filePath.startsWith('http')) {
        try {
          const parts = filePath.split('/upload/');
          if (parts.length === 2) {
            const pathAfterUpload = parts[1];
            let pathSegments = pathAfterUpload.split('/');
            if (pathSegments[0].match(/^v\d+$/)) {
              pathSegments.shift();
            }
            const fullPublicIdWithExt = pathSegments.join('/');
            const lastDotIdx = fullPublicIdWithExt.lastIndexOf('.');
            const publicId = lastDotIdx !== -1 ? fullPublicIdWithExt.substring(0, lastDotIdx) : fullPublicIdWithExt;
            
            await cloudinary.uploader.destroy(publicId);
            console.log(`[CLOUDINARY] Deleted asset: ${publicId}`);
          }
        } catch (cloudinaryErr) {
          console.error('[PROFILES ROUTE] Failed to delete file from Cloudinary:', cloudinaryErr.message);
        }
      } else {
        const absolutePath = path.join(__dirname, '../..', filePath);
        if (fs.existsSync(absolutePath)) {
          try {
            fs.unlinkSync(absolutePath);
          } catch (unlinkErr) {
            console.error('[PROFILES ROUTE] Failed to delete local file:', unlinkErr);
          }
        }
      }
    }
    await req.db.query('DELETE FROM InbodyUploads WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting Inbody upload:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 36. GET Client Documents
router.get('/documents/:clientId', authMiddleware, async (req, res) => {
  try {
    const result = await req.db.query(
      'SELECT * FROM ClientFiles WHERE client_id = $1 ORDER BY upload_date DESC', 
      [parseInt(req.params.clientId)]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('[PROFILES ROUTE] Error fetching client documents:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 37. POST upload Client Document
router.post('/documents/:clientId/upload', authMiddleware, async (req, res) => {
  const { fileName, base64 } = req.body;
  const clientId = parseInt(req.params.clientId);
  const tenantId = req.headers['x-tenant-id'] || 'default';
  try {
    let savedPath;
    if (isCloudinaryConfigured) {
      savedPath = await uploadBase64ToCloudinary(base64, 'documents', tenantId);
    } else {
      savedPath = saveBase64File(base64, fileName, 'documents', tenantId);
    }
    
    const result = await req.db.query(
      `INSERT INTO ClientFiles (client_id, file_name, local_file_path, upload_date)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [clientId, fileName, savedPath]
    );
    
    return res.json({ success: true, id: result.rows[0].id, filePath: savedPath });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error uploading document:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 38. POST add to Investigation Library
router.post('/investigations/library', authMiddleware, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await req.db.query(
      'INSERT INTO InvestigationLibrary (name) VALUES ($1) RETURNING id',
      [name.trim()]
    );
    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error adding to investigation library:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 39. DELETE from Investigation Library
router.delete('/investigations/library/:id', authMiddleware, async (req, res) => {
  try {
    await req.db.query('DELETE FROM InvestigationLibrary WHERE id = $1', [parseInt(req.params.id)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('[PROFILES ROUTE] Error deleting from investigation library:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
