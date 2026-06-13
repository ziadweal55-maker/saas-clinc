const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Checks network reachability by doing a DNS lookup on the Supabase hostname.
 * Returns false quickly if the host is unreachable (e.g. ERR_NAME_NOT_RESOLVED).
 */
async function isNetworkAvailable() {
  if (!supabaseUrl) return false;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const dns = require('dns').promises;
    await dns.lookup(hostname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pushes local records to Supabase.
 */
async function syncToCloud(tableName, localRecords) {
  if (!supabaseUrl || !supabaseKey) return { success: false, error: 'Missing Supabase Config' };
  if (!localRecords || localRecords.length === 0) return { success: true };

  try {
    const { error } = await supabase.from(tableName).upsert(localRecords);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error(`[SYNC] Error syncing ${tableName}:`, err);
    return { success: false, error: err.message };
  }
}

async function syncPatientPlan(payload) {
  if (!supabase) {
    return { success: false, error: 'Supabase client is not initialized. Check your config.' };
  }

  const networkOk = await isNetworkAvailable();
  if (!networkOk) {
    console.log('[SYNC] Network unavailable, skipping patient plan sync');
    return { success: false, error: 'Network unavailable' };
  }

  const {
    patientData, 
    exercises, 
    homeExercises,
    sessions, 
    assessments, 
    payments, 
    auditLogs, 
    doctors,
    assessmentRegions,
    assessmentTests,
    assessmentResults,
    clientProfiles
  } = payload;

  let patientUuid;

  try {
    console.log('[SYNC] Starting sync for patient:', patientData?.first_name, patientData?.last_name);

    // 1. Sync Doctors
    if (doctors && doctors.length > 0) {
      console.log(`[SYNC] Syncing ${doctors.length} doctors...`);
      const uniqueDoctors = Array.from(new Map(doctors.map(d => [d.name.toLowerCase().trim(), d])).values());
      await supabase.from('doctors').upsert(
        uniqueDoctors.map(d => ({ name: d.name, specialty: d.specialty, status: d.status, branch_id: d.branch_id || 1 })),
        { onConflict: 'name' }
      );
    }

    const { data: cloudDoctors } = await supabase.from('doctors').select('id, name');
    const doctorMap = {};
    cloudDoctors?.forEach(d => { 
      doctorMap[d.name.toLowerCase().trim()] = d.id; 
    });

    // 2. Upsert Patient
    if (!patientData?.sync_token) {
      throw new Error('Patient sync token missing.');
    }

    const { data: pData, error: pError } = await supabase
      .from('patients')
      .upsert({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        sync_token: patientData.sync_token,
        pin: patientData.pin,
        is_active: patientData.is_active === 1,
        medical_history: patientData.medical_history,
        date_of_birth: patientData.date_of_birth,
        phone: patientData.phone,
        branch_id: patientData.branch_id || 1
      }, { onConflict: 'sync_token' })
      .select()
      .single();

    if (pError) throw pError;
    patientUuid = pData.id;
    console.log('[SYNC] Patient UUID:', patientUuid);

    // 4. Push Exercises
    if (exercises && exercises.length > 0) {
      console.log(`[SYNC] Syncing ${exercises.length} exercises...`);
      const uniqueExercises = Array.from(new Map(exercises.map(ex => [ex.exercise_name.toLowerCase().trim(), ex])).values());
      const { error: eError } = await supabase.from('exercises').upsert(
        uniqueExercises.map(ex => ({
          patient_id: patientUuid,
          doctor_id: doctorMap[ex.doctor_name?.toLowerCase().trim()] || null,
          exercise_name: ex.exercise_name,
          type: ex.type || '',
          sets: ex.sets || '',
          reps: ex.reps || '',
          frequency: ex.frequency || '',
          notes: ex.notes || '',
          instructions: ex.instructions || '',
          video_url: ex.video_url || '',
          created_at: ex.assigned_at || new Date().toISOString(),
          branch_id: patientData.branch_id || 1
        })), { onConflict: 'patient_id, exercise_name' }
      );
      if (eError) throw eError;
      console.log('[SYNC] Exercises synced.');
    }

    // 5. Push Sessions
    const localSessionCloudIds = sessions ? sessions.map(s => `sess_${patientData.sync_token}_${s.id}`) : [];
    const sDelQuery = supabase.from('sessions').delete().eq('patient_id', patientUuid);
    if (localSessionCloudIds.length > 0) {
      await sDelQuery.not('local_id', 'in', localSessionCloudIds);
    } else {
      await sDelQuery;
    }

    if (sessions && sessions.length > 0) {
      console.log(`[SYNC] Syncing ${sessions.length} sessions...`);
      const { error: sError } = await supabase.from('sessions').upsert(
        sessions.map(s => ({
          local_id: `sess_${patientData.sync_token}_${s.id}`,
          patient_id: patientUuid,
          doctor_id: doctorMap[s.doctor_name?.toLowerCase().trim()] || null,
          session_date: s.session_date,
          session_number: s.session_number,
          notes: s.treatment_notes,
          payment_amount: s.payment_amount,
          payment_method: s.payment_method,
          session_type: s.session_type_name || null,
          created_at: s.session_date,
          branch_id: patientData.branch_id || 1
        })), { onConflict: 'local_id' }
      );
      if (sError) throw sError;
      console.log('[SYNC] Sessions synced.');
    }

    // 6. Push Assessments (Clinical Findings)
    const localAsmtCloudIds = assessments ? assessments.map(a => `asmt_${patientData.sync_token}_${a.id}`) : [];
    const aDelQuery = supabase.from('assessments').delete().eq('patient_id', patientUuid);
    if (localAsmtCloudIds.length > 0) {
      await aDelQuery.not('local_id', 'in', localAsmtCloudIds);
    } else {
      await aDelQuery;
    }

    if (assessments && assessments.length > 0) {
      console.log(`[SYNC] Syncing ${assessments.length} assessments...`);
      const { error: aError } = await supabase.from('assessments').upsert(
        assessments.map(a => ({
          local_id: `asmt_${patientData.sync_token}_${a.id}`,
          patient_id: patientUuid,
          doctor_id: doctorMap[a.doctor_name?.toLowerCase().trim()] || null,
          diagnosis: a.diagnosis,
          pain_scale: a.pain_scale,
          rom: a.rom,
          strength: a.strength,
          recommendations: a.recommendations,
          is_completed: a.is_completed === 1,
          assessment_date: a.assessment_date,
          created_at: a.created_at,
          branch_id: patientData.branch_id || 1
        })), { onConflict: 'local_id' }
      );
      if (aError) throw aError;
      console.log('[SYNC] Assessments synced.');
    }

    // 7. Push Payments
    const localPayCloudIds = payments ? payments.map(p => `pay_${patientData.sync_token}_${p.id}`) : [];
    const payDelQuery = supabase.from('payments').delete().eq('patient_id', patientUuid);
    if (localPayCloudIds.length > 0) {
      await payDelQuery.not('local_id', 'in', localPayCloudIds);
    } else {
      await payDelQuery;
    }

    if (payments && payments.length > 0) {
      console.log(`[SYNC] Syncing ${payments.length} payments...`);
      const { error: payError } = await supabase.from('payments').upsert(
        payments.map(p => ({
          local_id: `pay_${patientData.sync_token}_${p.id}`,
          patient_id: patientUuid,
          amount: p.amount,
          payment_type: p.payment_type,
          payment_date: p.payment_date,
          created_at: p.payment_date,
          branch_id: patientData.branch_id || 1
        })), { onConflict: 'local_id' }
      );
      if (payError) throw payError;
      console.log('[SYNC] Payments synced.');
    }

    // 8. Push Bio-Metric Assessment Structure & Results
    console.log(`[SYNC] Syncing assessment structure (regions: ${assessmentRegions?.length || 0}, tests: ${assessmentTests?.length || 0})...`);
    
    // Sync Regions (Deduplicated)
    if (assessmentRegions && assessmentRegions.length > 0) {
      const uniqueRegions = Array.from(new Set(assessmentRegions.map(r => r.name.trim())));
      await supabase.from('assessment_regions').upsert(
        uniqueRegions.map(name => ({ name })),
        { onConflict: 'name' }
      );
    }
    
    const { data: cloudRegs } = await supabase.from('assessment_regions').select('id, name');
    const regMap = {};
    cloudRegs?.forEach(r => { regMap[r.name.toLowerCase().trim()] = r.id; });

    // Sync Tests (Deduplicated)
    if (assessmentTests && assessmentTests.length > 0) {
      const uniqueTestsMap = new Map();
      assessmentTests.forEach(t => {
        const localReg = assessmentRegions.find(r => r.id === t.region_id);
        const regionName = localReg?.name.toLowerCase().trim();
        const cloudRegId = regMap[regionName];
        if (cloudRegId) {
          const key = `${cloudRegId}_${t.name.toLowerCase().trim()}`;
          uniqueTestsMap.set(key, {
            region_id: cloudRegId,
            name: t.name,
            description: t.description
          });
        }
      });
      
      const uniqueTests = Array.from(uniqueTestsMap.values());
      if (uniqueTests.length > 0) {
        await supabase.from('assessment_tests').upsert(uniqueTests, { onConflict: 'region_id, name' });
      }
    }

    // Map and Push ALL Results
    if (assessmentResults && assessmentResults.length > 0) {
      console.log(`[SYNC] Syncing ${assessmentResults.length} assessment findings...`);
      
      // Re-fetch tests for accurate mapping
      const { data: latestCloudTests } = await supabase.from('assessment_tests').select('id, name, region_id');
      const testMap = {};
      latestCloudTests?.forEach(t => {
        const rName = cloudRegs?.find(reg => reg.id === t.region_id)?.name.toLowerCase().trim();
        if (rName) testMap[`${rName}_${t.name.toLowerCase().trim()}`] = t.id;
      });

      const mappedResults = assessmentResults.map(res => {
        const localTest = assessmentTests.find(t => t.id === res.test_id);
        const localReg = assessmentRegions.find(r => r.id === localTest?.region_id);
        const key = `${localReg?.name.toLowerCase().trim()}_${localTest?.name.toLowerCase().trim()}`;
        const cloudTestId = testMap[key];
        
        if (!cloudTestId) {
          console.warn(`[SYNC] Could not map test result ${res.id} - Test/Region not found in cloud mapping.`);
          return null;
        }

        return {
          local_id: `res_${patientData.sync_token}_${res.id}`,
          patient_id: patientUuid,
          test_id: cloudTestId,
          result: res.result,
          created_at: res.created_at,
          branch_id: patientData.branch_id || 1
        };
      }).filter(Boolean);

      if (mappedResults.length > 0) {
        console.log(`[SYNC] Final upload: ${mappedResults.length} results to cloud...`);
        const { error: resError } = await supabase.from('assessment_results').upsert(mappedResults, { onConflict: 'local_id' });
        if (resError) throw resError;
        console.log('[SYNC] Assessment results uploaded successfully.');
      }
    }

    // 9. Sync Client Profiles & profile-specific data
    const localProfileCloudIds = clientProfiles ? clientProfiles.map(p => `cp_${patientData.sync_token}_${p.id}`) : [];
    const cpDelQuery = supabase.from('client_profiles').delete().eq('patient_id', patientUuid);
    if (localProfileCloudIds.length > 0) {
      await cpDelQuery.not('local_id', 'in', localProfileCloudIds);
    } else {
      await cpDelQuery;
    }

    if (clientProfiles && clientProfiles.length > 0) {
      console.log(`[SYNC] Syncing ${clientProfiles.length} client profiles...`);
      
      const profilesToUpsert = clientProfiles.map(p => ({
        local_id: `cp_${patientData.sync_token}_${p.id}`,
        patient_id: patientUuid,
        profile_type: p.profile_type,
        name: p.name,
        created_at: p.created_at || new Date().toISOString(),
        branch_id: patientData.branch_id || 1
      }));

      const { error: cpError } = await supabase
        .from('client_profiles')
        .upsert(profilesToUpsert, { onConflict: 'local_id' });
      
      if (cpError) throw cpError;

      // Sync profile-specific children
      for (const p of clientProfiles) {
        const profileLocalId = `cp_${patientData.sync_token}_${p.id}`;

        if (p.profile_type === 'physical_therapy') {
          // Red Flags
          if (p.redFlags) {
            const { error: rfError } = await supabase
              .from('pt_red_flags')
              .upsert({
                local_id: `rf_${patientData.sync_token}_${p.id}`,
                profile_local_id: profileLocalId,
                flags: p.redFlags.flags || [],
                other_text: p.redFlags.other_text || '',
                updated_at: p.redFlags.updated_at || new Date().toISOString()
              }, { onConflict: 'local_id' });
            if (rfError) throw rfError;
          }

          // Subjective Assessments
          const ptSubjectivesList = p.ptSubjectives || [];
          const localSubjCloudIds = ptSubjectivesList.map(sub => `subj_${patientData.sync_token}_${sub.id}`);
          
          const subjDelQuery = supabase.from('pt_subjective').delete().eq('profile_local_id', profileLocalId);
          if (localSubjCloudIds.length > 0) {
            await subjDelQuery.not('local_id', 'in', localSubjCloudIds);
          } else {
            await subjDelQuery;
          }

          for (const sub of ptSubjectivesList) {
            const { error: subError } = await supabase
              .from('pt_subjective')
              .upsert({
                local_id: `subj_${patientData.sync_token}_${sub.id}`,
                profile_local_id: profileLocalId,
                chief_complaint: sub.chief_complaint || '',
                aggravating: sub.aggravating || '',
                easing: sub.easing || '',
                irritability: sub.irritability || '',
                irritability_notes: sub.irritability_notes || '',
                nature: sub.nature || '',
                nature_notes: sub.nature_notes || '',
                doctor_id: sub.doctor_id || null,
                updated_at: sub.updated_at || new Date().toISOString()
              }, { onConflict: 'local_id' });
            if (subError) throw subError;
          }

          // Objective Rows
          await supabase.from('pt_objective_rows').delete().eq('profile_local_id', profileLocalId);
          
          const subjectiveIdsSet = new Set(ptSubjectivesList.map(s => Number(s.id)));

          const objectiveRowsList = (p.objectiveRows || []).filter(r => {
            if (!r.subjective_id) return true;
            return subjectiveIdsSet.has(Number(r.subjective_id));
          });
          
          if (objectiveRowsList.length > 0) {
            const rowsToInsert = objectiveRowsList.map((r, idx) => ({
              local_id: `obj_${patientData.sync_token}_${r.id || idx}`,
              profile_local_id: profileLocalId,
              subjective_local_id: r.subjective_id ? `subj_${patientData.sync_token}_${r.subjective_id}` : null,
              row_type: r.row_type,
              joint_name: r.joint_name || '',
              pain: r.pain === 1 || r.pain === true,
              limitation: r.limitation === 1 || r.limitation === true,
              angle: r.angle || '',
              sort_order: r.sort_order || idx
            }));

            const { error: rowsError } = await supabase
              .from('pt_objective_rows')
              .insert(rowsToInsert);
            if (rowsError) throw rowsError;
          }

          // Palpations
          const rawPalpationsList = p.palpations || [];
          const palpationsList = rawPalpationsList.filter(palp => {
            if (!palp.subjective_id) return true;
            return subjectiveIdsSet.has(Number(palp.subjective_id));
          });
          const localPalpCloudIds = palpationsList.map(palp => `palp_${patientData.sync_token}_${palp.id}`);
          
          const palpDelQuery = supabase.from('pt_objective_palpation').delete().eq('profile_local_id', profileLocalId);
          if (localPalpCloudIds.length > 0) {
            await palpDelQuery.not('local_id', 'in', localPalpCloudIds);
          } else {
            await palpDelQuery;
          }

          for (const palp of palpationsList) {
            const { error: palpError } = await supabase
              .from('pt_objective_palpation')
              .upsert({
                local_id: `palp_${patientData.sync_token}_${palp.id}`,
                profile_local_id: profileLocalId,
                subjective_local_id: palp.subjective_id ? `subj_${patientData.sync_token}_${palp.subjective_id}` : null,
                notes: palp.notes || '',
                doctor_id: palp.doctor_id || null,
                updated_at: palp.updated_at || new Date().toISOString()
              }, { onConflict: 'local_id' });
            if (palpError) throw palpError;
          }

          // Session Plans list
          let sessionPlansList = p.sessionPlans || [];
          if (sessionPlansList.length === 0 && p.sessionPlan) {
            sessionPlansList = [p.sessionPlan];
          }

          const localSpCloudIds = sessionPlansList.map(sp => `sp_${patientData.sync_token}_${sp.id}`);
          const spDelQuery = supabase.from('pt_session_plan').delete().eq('profile_local_id', profileLocalId);
          if (localSpCloudIds.length > 0) {
            await spDelQuery.not('local_id', 'in', localSpCloudIds);
          } else {
            await spDelQuery;
          }

          if (sessionPlansList.length > 0) {
            const spsToUpsert = sessionPlansList.map(sp => ({
              local_id: `sp_${patientData.sync_token}_${sp.id}`,
              profile_local_id: profileLocalId,
              electrotherapy: typeof sp.electrotherapy === 'string' ? JSON.parse(sp.electrotherapy) : sp.electrotherapy || {},
              manual_therapy: typeof sp.manual_therapy === 'string' ? JSON.parse(sp.manual_therapy) : sp.manual_therapy || {},
              tools: typeof sp.tools === 'string' ? JSON.parse(sp.tools) : sp.tools || {},
              updated_at: sp.updated_at || new Date().toISOString()
            }));

            const { error: spError } = await supabase
              .from('pt_session_plan')
              .upsert(spsToUpsert, { onConflict: 'local_id' });
            if (spError) throw spError;
          }
        } else if (p.profile_type === 'nutrition') {
          // Medical History
          const localHistCloudIds = p.nutritionHistory ? p.nutritionHistory.map(h => `nut_hist_${patientData.sync_token}_${h.id}`) : [];
          const histDelQuery = supabase.from('nutrition_medical_history').delete().eq('profile_local_id', profileLocalId);
          if (localHistCloudIds.length > 0) {
            await histDelQuery.not('local_id', 'in', localHistCloudIds);
          } else {
            await histDelQuery;
          }

          if (p.nutritionHistory && p.nutritionHistory.length > 0) {
            const historyToUpsert = p.nutritionHistory.map(h => ({
              local_id: `nut_hist_${patientData.sync_token}_${h.id}`,
              profile_local_id: profileLocalId,
              content: h.content,
              session_date: h.session_date,
              created_at: h.created_at || new Date().toISOString()
            }));

            const { error: histError } = await supabase
              .from('nutrition_medical_history')
              .upsert(historyToUpsert, { onConflict: 'local_id' });
            if (histError) throw histError;
          }

          // Investigations
          const localInvCloudIds = p.investigations ? p.investigations.map(i => `inv_${patientData.sync_token}_${i.id}`) : [];
          const invDelQuery = supabase.from('client_investigations').delete().eq('profile_local_id', profileLocalId);
          if (localInvCloudIds.length > 0) {
            await invDelQuery.not('local_id', 'in', localInvCloudIds);
          } else {
            await invDelQuery;
          }

          if (p.investigations && p.investigations.length > 0) {
            const invsToUpsert = p.investigations.map(i => ({
              local_id: `inv_${patientData.sync_token}_${i.id}`,
              profile_local_id: profileLocalId,
              investigation_name: i.investigation_name || i.name,
              result_text: i.result_text || '',
              result_date: i.result_date,
              created_at: i.created_at || new Date().toISOString()
            }));

            const { error: invError } = await supabase
              .from('client_investigations')
              .upsert(invsToUpsert, { onConflict: 'local_id' });
            if (invError) throw invError;
          }

          // Inbody Uploads
          const localInbCloudIds = p.inbodyUploads ? p.inbodyUploads.map(u => `inb_${patientData.sync_token}_${u.id}`) : [];
          const inbDelQuery = supabase.from('inbody_uploads').delete().eq('profile_local_id', profileLocalId);
          if (localInbCloudIds.length > 0) {
            await inbDelQuery.not('local_id', 'in', localInbCloudIds);
          } else {
            await inbDelQuery;
          }

          if (p.inbodyUploads && p.inbodyUploads.length > 0) {
            const uploadsToUpsert = p.inbodyUploads.map(u => ({
              local_id: `inb_${patientData.sync_token}_${u.id}`,
              profile_local_id: profileLocalId,
              file_name: u.file_name,
              local_file_path: u.local_file_path,
              session_date: u.session_date,
              upload_date: u.upload_date || new Date().toISOString()
            }));

            const { error: uploadError } = await supabase
              .from('inbody_uploads')
              .upsert(uploadsToUpsert, { onConflict: 'local_id' });
            if (uploadError) throw uploadError;
          }
        } else if (p.profile_type === 'lymphatic') {
          // Lymphatic Measurements
          const localMeasCloudIds = p.lymphaticMeasurements ? p.lymphaticMeasurements.map(m => `lymph_${patientData.sync_token}_${m.id}`) : [];
          const measDelQuery = supabase.from('lymphatic_measurements').delete().eq('profile_local_id', profileLocalId);
          if (localMeasCloudIds.length > 0) {
            await measDelQuery.not('local_id', 'in', localMeasCloudIds);
          } else {
            await measDelQuery;
          }

          if (p.lymphaticMeasurements && p.lymphaticMeasurements.length > 0) {
            const measToUpsert = p.lymphaticMeasurements.map(m => ({
              local_id: `lymph_${patientData.sync_token}_${m.id}`,
              profile_local_id: profileLocalId,
              measurement_name: m.measurement_name,
              value: m.value || '',
              unit: m.unit || 'cm',
              session_date: m.session_date,
              created_at: m.created_at || new Date().toISOString()
            }));

            const { error: measError } = await supabase
              .from('lymphatic_measurements')
              .upsert(measToUpsert, { onConflict: 'local_id' });
            if (measError) throw measError;
          }
        }
      }
    }

    // 10. Sync Home Exercises
    const localHexCloudIds = homeExercises ? homeExercises.map(he => `hex_${patientData.sync_token}_${he.id}`) : [];
    const heDelQuery = supabase.from('home_exercises').delete().eq('patient_id', patientUuid);
    if (localHexCloudIds.length > 0) {
      await heDelQuery.not('local_id', 'in', localHexCloudIds);
    } else {
      await heDelQuery;
    }

    if (homeExercises && homeExercises.length > 0) {
      console.log(`[SYNC] Syncing ${homeExercises.length} home exercises...`);
      const exercisesToUpsert = homeExercises.map(he => ({
        local_id: `hex_${patientData.sync_token}_${he.id}`,
        patient_id: patientUuid,
        doctor_id: doctorMap[he.doctor_name?.toLowerCase().trim()] || null,
        exercise_name: he.exercise_name,
        sets: he.sets || '',
        reps: he.reps || '',
        frequency: he.frequency || '',
        notes: he.notes || '',
        video_url: he.video_url || null,
        assigned_at: he.assigned_at || new Date().toISOString(),
        updated_at: he.updated_at || new Date().toISOString(),
        branch_id: patientData.branch_id || 1
      }));

      const { error: heError } = await supabase
        .from('home_exercises')
        .upsert(exercisesToUpsert, { onConflict: 'local_id' });
      if (heError) throw heError;
      console.log('[SYNC] Home exercises synced.');
    }

    console.log('[SYNC] Full patient profile sync completed.');
    return { success: true };
  } catch (err) {
    console.error('[SYNC] Sync process failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Syncs the global Appointments table to Supabase.
 */
async function syncAppointments(db) {
  if (!supabaseUrl || !supabaseKey) return { success: false, error: 'Missing Supabase Config' };

  const networkOk = await isNetworkAvailable();
  if (!networkOk) {
    console.log('[SYNC] Network unavailable, skipping appointments sync');
    return { success: false, error: 'Network unavailable' };
  }

  try {
    console.log('[SYNC] Starting global appointments sync...');
    
    // Fetch all local appointments with client and doctor names
    const appointments = db.prepare(`
      SELECT 
        a.id as local_id,
        a.client_id,
        a.doctor_id,
        a.appointment_date,
        a.status,
        a.completed_by_staff_id,
        a.branch_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.phone as client_phone,
        d.name as doctor_name
      FROM Appointments a
      LEFT JOIN Clients c ON a.client_id = c.id
      LEFT JOIN Doctors d ON a.doctor_id = d.id
    `).all();

    const localIds = appointments.map(a => a.local_id);
    if (localIds.length > 0) {
      // 1. Delete remote records that don't exist locally anymore (handle cancellations/deletions)
      const { error: delError } = await supabase
        .from('portal_appointments')
        .delete()
        .not('local_id', 'in', localIds);
      if (delError) console.error('[SYNC] Error cleaning up deleted appointments:', delError);
    } else {
      // If no local appointments exist, clear all on remote
      await supabase.from('portal_appointments').delete().neq('local_id', -1);
    }

    // 2. Upsert existing local appointments
    if (appointments.length > 0) {
      const recordsToUpsert = appointments.map(a => ({
        local_id: a.local_id,
        client_id: a.client_id,
        doctor_id: a.doctor_id,
        appointment_date: new Date(a.appointment_date).toISOString(),
        status: a.status || 'Scheduled',
        completed_by_staff_id: a.completed_by_staff_id || null,
        client_first_name: a.client_first_name || '',
        client_last_name: a.client_last_name || '',
        client_phone: a.client_phone || '',
        doctor_name: a.doctor_name || '',
        branch_id: a.branch_id || 1
      }));

      const { error: upsertError } = await supabase
        .from('portal_appointments')
        .upsert(recordsToUpsert, { onConflict: 'local_id' });
      
      if (upsertError) throw upsertError;
    }

    console.log(`[SYNC] Successfully synced ${appointments.length} appointments to cloud.`);
    return { success: true };
  } catch (err) {
    console.error('[SYNC] Appointment sync failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Syncs the global Users table to Supabase.
 */
async function syncUsers(db) {
  if (!supabaseUrl || !supabaseKey) return { success: false, error: 'Missing Supabase Config' };

  const networkOk = await isNetworkAvailable();
  if (!networkOk) {
    console.log('[SYNC] Network unavailable, skipping user sync');
    return { success: false, error: 'Network unavailable' };
  }

  try {
    console.log('[SYNC] Starting global users sync...');
    
    // Fetch all local users
    const users = db.prepare(`
      SELECT 
        id as local_id,
        username,
        password_hash,
        role,
        doctor_id,
        status,
        branch_id
      FROM Users
    `).all();

    const localIds = users.map(u => u.local_id);
    if (localIds.length > 0) {
      // 1. Delete remote users that don't exist locally anymore
      const { error: delError } = await supabase
        .from('portal_users')
        .delete()
        .not('local_id', 'in', localIds);
      if (delError) console.error('[SYNC] Error cleaning up deleted users:', delError);
    }

    // 2. Upsert existing users
    if (users.length > 0) {
      const recordsToUpsert = users.map(u => ({
        local_id: u.local_id,
        username: u.username,
        password_hash: u.password_hash,
        role: u.role || 'admin',
        doctor_id: u.doctor_id || null,
        status: u.status || 'active',
        branch_id: u.branch_id || null
      }));

      const { error: upsertError } = await supabase
        .from('portal_users')
        .upsert(recordsToUpsert, { onConflict: 'local_id' });
      
      if (upsertError) throw upsertError;
    }

    console.log(`[SYNC] Successfully synced ${users.length} users to cloud.`);
    return { success: true };
  } catch (err) {
    console.error('[SYNC] User sync failed:', err);
    return { success: false, error: err.message };
  }
}

async function processSyncQueue(db) {
  if (!supabaseUrl || !supabaseKey) return { success: false, error: 'Missing Supabase Config' };

  const networkOk = await isNetworkAvailable();
  if (!networkOk) {
    console.log('[SYNC] Network unavailable, skipping sync queue processing');
    return { success: false, error: 'Network unavailable' };
  }

  try {
    // Fetch outstanding sync tasks with attempts < 5
    const queue = db.prepare("SELECT * FROM SyncQueue WHERE attempts < 5 ORDER BY created_at ASC").all();
    if (queue.length === 0) return { success: true, count: 0 };
    
    console.log(`[SYNC QUEUE] Found ${queue.length} outstanding sync tasks to process.`);
    
    for (const task of queue) {
      try {
        const payload = JSON.parse(task.payload);
        console.log(`[SYNC QUEUE] Retrying task #${task.id} for client #${task.client_id}...`);
        
        const res = await syncPatientPlan(payload);
        if (res.success) {
          // Sync succeeded! Delete from queue
          db.prepare("DELETE FROM SyncQueue WHERE id = ?").run(task.id);
          console.log(`[SYNC QUEUE] Task #${task.id} completed and removed from queue.`);
        } else {
          throw new Error(res.error || 'Unknown sync error');
        }
      } catch (err) {
        const nextAttempts = task.attempts + 1;
        db.prepare(`
          UPDATE SyncQueue 
          SET attempts = ?, last_attempt = datetime('now', 'localtime'), error_message = ? 
          WHERE id = ?
        `).run(nextAttempts, err.message, task.id);
        console.error(`[SYNC QUEUE] Task #${task.id} failed (attempt ${nextAttempts}):`, err.message);
      }
    }
    
    return { success: true, count: queue.length };
  } catch (err) {
    console.error('[SYNC QUEUE] Error draining queue:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { syncToCloud, syncPatientPlan, syncAppointments, syncUsers, supabase, processSyncQueue };

