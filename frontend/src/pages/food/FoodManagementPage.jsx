import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getFoodDashboardStats,
  getFoodPlans,
  createFoodPlan,
  updateFoodPlan,
  createFoodSubscription,
  changeSubscriptionPlan,
  getMyFoodSubscription,
} from '../../services/foodSubscriptionService';
import { getTodayMenu } from '../../services/menuService';
import FoodNav from '../../components/food/FoodNav';
import FoodStats from '../../components/food/FoodStats';
import {
  Utensils,
  Plus,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Sparkles,
  RefreshCw,
  Loader2,
  IndianRupee,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';

export default function FoodManagementPage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MESS_MANAGER'].includes(user?.role);

  // State
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [todayMenu, setTodayMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal State for Add / Edit Plan
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const initialPlanForm = {
    id: null,
    name: '',
    code: '',
    description: '',
    hasBreakfast: true,
    hasLunch: true,
    hasSnacks: false,
    hasDinner: true,
    monthlyPrice: 3500,
    status: 'ACTIVE',
  };
  const [planForm, setPlanForm] = useState(initialPlanForm);

  // Details Modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, plansRes, menuRes] = await Promise.all([
        getFoodDashboardStats(),
        getFoodPlans(),
        getTodayMenu(),
      ]);

      setStats(statsRes.data);
      setPlans(plansRes.data || []);
      setTodayMenu(menuRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load food management data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenAddPlan = () => {
    setPlanForm(initialPlanForm);
    setIsEditing(false);
    setModalError(null);
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      hasBreakfast: !!plan.has_breakfast,
      hasLunch: !!plan.has_lunch,
      hasSnacks: !!plan.has_snacks,
      hasDinner: !!plan.has_dinner,
      monthlyPrice: plan.monthly_price,
      status: plan.status,
    });
    setIsEditing(true);
    setModalError(null);
    setPlanModalOpen(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      if (isEditing) {
        await updateFoodPlan(planForm.id, planForm);
        setActionSuccess(`Food plan "${planForm.name}" updated successfully.`);
      } else {
        await createFoodPlan(planForm);
        setActionSuccess(`Food plan "${planForm.name}" created successfully.`);
      }

      setPlanModalOpen(false);
      fetchDashboardData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setModalError(err.message || 'Failed to save food plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <FoodNav />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Utensils className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Food & Dining Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage meal subscriptions, food packages, live kitchen schedules, and daily consumption analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-all shadow-xs"
            title="Refresh dining dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAddPlan}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Food Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Statistics Cards */}
      <FoodStats stats={stats || {}} loading={loading} />

      {/* ========================================================================= */}
      {/* FOOD / MEAL PLANS GRID                                                    */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Available Food & Dining Plans</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">{plans.length} configured plans</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isActive = plan.status === 'ACTIVE';

            return (
              <div
                key={plan.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all relative group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {plan.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {plan.description || 'Standard institutional mess package with fresh daily meals.'}
                  </p>

                  {/* Included Meals Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Included Daily Meals
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.has_breakfast ? (
                        <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] flex items-center gap-1">
                          <Coffee className="w-2.5 h-2.5" />
                          <span>Breakfast</span>
                        </span>
                      ) : null}
                      {plan.has_lunch ? (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] flex items-center gap-1">
                          <Sun className="w-2.5 h-2.5" />
                          <span>Lunch</span>
                        </span>
                      ) : null}
                      {plan.has_snacks ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] flex items-center gap-1">
                          <Cookie className="w-2.5 h-2.5" />
                          <span>Snacks</span>
                        </span>
                      ) : null}
                      {plan.has_dinner ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] flex items-center gap-1">
                          <Moon className="w-2.5 h-2.5" />
                          <span>Dinner</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Price & Subscribers */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Monthly Price</p>
                      <p className="text-lg font-bold text-emerald-400">
                        ₹{Number(plan.monthly_price).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Subscribers</p>
                      <p className="text-sm font-bold text-slate-200 flex items-center gap-1 justify-end">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>{plan.subscriber_count || 0}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setDetailsModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Plan</span>
                  </button>

                  {canManage && (
                    <button
                      onClick={() => handleOpenEditPlan(plan)}
                      className="p-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                      title="Edit food plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DAILY MEAL TIMINGS & SERVING SCHEDULES                                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Daily Institutional Mess Schedule</h3>
          </div>
          <span className="text-xs text-slate-400">Fixed Operating Hours</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                <Coffee className="w-4 h-4" />
                <span>BREAKFAST</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">07:30 - 09:30</span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2">
              {todayMenu?.BREAKFAST?.items || 'Idli, Medu Vada, Sambar, Coconut Chutney, Tea & Coffee'}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 flex justify-between">
              <span>Consumed Today:</span>
              <span className="font-bold text-yellow-400">{stats?.todayBreakfastCount || 0}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <Sun className="w-4 h-4" />
                <span>LUNCH</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">12:30 - 14:30</span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2">
              {todayMenu?.LUNCH?.items || 'Steamed Rice, Paneer Butter Masala, Dal Tadka, Roti, Curd'}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 flex justify-between">
              <span>Consumed Today:</span>
              <span className="font-bold text-orange-400">{stats?.todayLunchCount || 0}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Cookie className="w-4 h-4" />
                <span>EVENING SNACKS</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">17:00 - 18:15</span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2">
              {todayMenu?.SNACKS?.items || 'Veg Puff / Samosa with Masala Chai & Lemon Tea'}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 flex justify-between">
              <span>Consumed Today:</span>
              <span className="font-bold text-purple-400">{stats?.todaySnacksCount || 0}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Moon className="w-4 h-4" />
                <span>DINNER</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">19:30 - 21:30</span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2">
              {todayMenu?.DINNER?.items || 'Jeera Rice, Mixed Veg Curry, Phulka, Rasam, Gulab Jamun'}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 flex justify-between">
              <span>Consumed Today:</span>
              <span className="font-bold text-indigo-400">{stats?.todayDinnerCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT FOOD PLAN MODAL                                                */}
      {/* ========================================================================= */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold">
                  {isEditing ? `Edit Food Plan: ${planForm.name}` : 'Create New Food Plan'}
                </h3>
              </div>
              <button
                onClick={() => setPlanModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handlePlanSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Board Mess"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FP-FULL"
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white uppercase focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Details of meals covered, nutrition standards..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Meal Inclusions Checkboxes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Meals Included in Plan</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, hasBreakfast: !planForm.hasBreakfast })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      planForm.hasBreakfast
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    Breakfast
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, hasLunch: !planForm.hasLunch })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      planForm.hasLunch
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    Lunch
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, hasSnacks: !planForm.hasSnacks })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      planForm.hasSnacks
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    Snacks
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, hasDinner: !planForm.hasDinner })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      planForm.hasDinner
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    Dinner
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={planForm.monthlyPrice}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Plan Status</label>
                  <select
                    value={planForm.status}
                    onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="ACTIVE">Active (Available for subscription)</option>
                    <option value="INACTIVE">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/30"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditing ? 'Save Plan' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PLAN DETAILS MODAL                                                        */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">{selectedPlan.name}</h3>
                  <span className="text-xs font-mono text-amber-400">{selectedPlan.code}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedPlan.description || 'Standard institutional mess package with fresh daily meals.'}
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Billing:</span>
                <span className="font-bold text-emerald-400">₹{Number(selectedPlan.monthly_price).toLocaleString('en-IN')}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Students Subscribed:</span>
                <span className="font-bold text-white">{selectedPlan.subscriber_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-400">{selectedPlan.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
              {user?.role === 'STUDENT' && (
                <button
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      setError(null);
                      const mySubRes = await getMyFoodSubscription();
                      let res;
                      if (mySubRes?.success && mySubRes?.data?.id) {
                        res = await changeSubscriptionPlan(mySubRes.data.id, {
                          new_plan_id: selectedPlan.id,
                          remarks: 'Switched plan from Food Plans page',
                        });
                        if (res?.success) {
                          setActionSuccess(`Successfully switched your food plan to ${selectedPlan.name}!`);
                        }
                      } else {
                        res = await createFoodSubscription({
                          plan_id: selectedPlan.id,
                          start_date: new Date().toISOString().split('T')[0],
                          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          monthly_price: selectedPlan.monthly_price,
                        });
                        if (res?.success) {
                          setActionSuccess(`Successfully subscribed to ${selectedPlan.name}!`);
                        }
                      }
                      setDetailsModalOpen(false);
                      fetchDashboardData();
                      setTimeout(() => setActionSuccess(null), 4000);
                    } catch (err) {
                      setError(err.response?.data?.message || err.message || 'Failed to subscribe to plan');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Processing...' : 'Subscribe / Switch to Plan'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
