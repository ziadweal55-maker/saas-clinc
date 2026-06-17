import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/adminApi';
import { useToast } from '../components/Toast';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_users: number | null;
  max_branches: number | null;
  max_storage_mb: number | null;
  max_patients: number | null;
  description: string | null;
  is_active: boolean;
}

const PlansView: React.FC = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  // Form fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState<number>(0);
  const [maxUsers, setMaxUsers] = useState<string>('');
  const [maxBranches, setMaxBranches] = useState<string>('');
  const [maxStorageMb, setMaxStorageMb] = useState<string>('');
  const [maxPatients, setMaxPatients] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPlans();
      const data = res.data?.data ?? res.data;
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to fetch subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const resetForm = () => {
    setId('');
    setName('');
    setPriceMonthly(0);
    setMaxUsers('');
    setMaxBranches('');
    setMaxStorageMb('');
    setMaxPatients('');
    setDescription('');
    setIsActive(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setId(plan.id);
    setName(plan.name);
    setPriceMonthly(plan.price_monthly);
    setMaxUsers(plan.max_users !== null ? String(plan.max_users) : '');
    setMaxBranches(plan.max_branches !== null ? String(plan.max_branches) : '');
    setMaxStorageMb(plan.max_storage_mb !== null ? String(plan.max_storage_mb) : '');
    setMaxPatients(plan.max_patients !== null ? String(plan.max_patients) : '');
    setDescription(plan.description ?? '');
    setIsActive(plan.is_active);
    setShowCreateModal(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Plan name is required', 'error');
      return;
    }
    
    const payload = {
      name: name.trim(),
      price_monthly: Number(priceMonthly),
      max_users: maxUsers.trim() !== '' ? Number(maxUsers) : null,
      max_branches: maxBranches.trim() !== '' ? Number(maxBranches) : null,
      max_storage_mb: maxStorageMb.trim() !== '' ? Number(maxStorageMb) : null,
      max_patients: maxPatients.trim() !== '' ? Number(maxPatients) : null,
      description: description.trim() || null,
      is_active: isActive,
    };

    setActionLoading(true);
    try {
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, payload);
        showToast('Plan updated successfully', 'success');
        setEditingPlan(null);
      } else {
        if (!id.trim()) {
          showToast('Plan ID is required for new plans', 'error');
          setActionLoading(false);
          return;
        }
        await adminApi.createPlan({
          ...payload,
          id: id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        });
        showToast('Plan created successfully', 'success');
        setShowCreateModal(false);
      }
      resetForm();
      fetchPlans();
    } catch {
      showToast('Failed to save plan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-center">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Subscription Plans</h2>
          <p>Configure pricing tiers, usage limitations, and feature allocations</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Plan
        </button>
      </div>

      <div className="plan-cards" style={{ marginTop: 24 }}>
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.id === 'pro' ? 'featured' : ''}`}>
            <div className="plan-name">{plan.name}</div>
            <div className="plan-price">
              {plan.price_monthly === 0 ? 'Free' : `${plan.price_monthly} EGP`}
              <span>/month</span>
            </div>
            
            <p className="text-muted text-sm" style={{ minHeight: 40, marginTop: 8 }}>
              {plan.description || 'No description provided.'}
            </p>
            
            <div className="plan-limits">
              <div className="plan-limit-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Users limit: {plan.max_users === null ? 'Unlimited' : plan.max_users}
              </div>
              <div className="plan-limit-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Branches limit: {plan.max_branches === null ? 'Unlimited' : plan.max_branches}
              </div>
              <div className="plan-limit-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Storage limit: {plan.max_storage_mb === null ? 'Unlimited' : `${plan.max_storage_mb} MB`}
              </div>
              <div className="plan-limit-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Patients limit: {plan.max_patients === null ? 'Unlimited' : plan.max_patients}
              </div>
              <div className="plan-limit-item" style={{ marginTop: 8 }}>
                <span className={`badge ${plan.is_active ? 'badge-active' : 'badge-suspended'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm w-full"
              style={{ marginTop: 24, justifyContent: 'center' }}
              onClick={() => handleOpenEdit(plan)}
            >
              Edit Properties
            </button>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingPlan(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h3>{editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}</h3>
            <p>{editingPlan ? 'Modify limits and configuration values for this tier.' : 'Define a new subscription tier for SaaS clinics.'}</p>
            
            <form onSubmit={handleSavePlan}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Plan ID (Unique code)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="e.g. premium-plus"
                    disabled={!!editingPlan}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Premium Plus"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Monthly Price (EGP)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 16 }}>
                  <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                    <span className="toggle">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Plan is Active</span>
                  </label>
                </div>
              </div>

              <div className="divider" />

              <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
                Tier Limitations (Leave empty for Unlimited values)
              </p>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Users</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Branches</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxBranches}
                    onChange={(e) => setMaxBranches(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Storage (MB)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxStorageMb}
                    onChange={(e) => setMaxStorageMb(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Patients</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxPatients}
                    onChange={(e) => setMaxPatients(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the plan benefits and target audience..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowCreateModal(false); setEditingPlan(null); }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Plan Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansView;
