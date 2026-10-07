import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getTodayMenu,
  getWeeklyMenu,
  getMealTypes,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../../services/menuService';
import {
  Utensils,
  Plus,
  Calendar,
  Clock,
  Flame,
  Star,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  Coffee,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function MenuPage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MESS_MANAGER'].includes(user?.role);

  // State
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'weekly'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayMenuData, setTodayMenuData] = useState(null);
  const [weeklyMenuData, setWeeklyMenuData] = useState(null);
  const [mealTypes, setMealTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Selected Day in Weekly Tab
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return dayNames[new Date().getDay()];
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [formData, setFormData] = useState({
    dayOfWeek: 'MONDAY',
    mealTypeId: '',
    itemsDescription: '',
    specialItem: '',
    caloriesEst: '',
    isActive: true,
  });

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesRes, todayRes, weeklyRes] = await Promise.all([
        getMealTypes(),
        getTodayMenu(selectedDate),
        getWeeklyMenu(),
      ]);

      const typesData = typesRes.data?.data || typesRes.data || [];
      setMealTypes(typesData);
      setTodayMenuData(todayRes.data?.data || todayRes.data);
      setWeeklyMenuData(weeklyRes.data?.data || weeklyRes.data);

      if (typesData.length > 0 && !formData.mealTypeId) {
        setFormData((prev) => ({ ...prev, mealTypeId: typesData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
      setError(err.response?.data?.message || 'Failed to load food menu from MySQL database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Toast notification timer
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Open modal for Adding
  const handleOpenAddModal = (defaultDay = null, defaultMealTypeId = null) => {
    setIsEditing(false);
    setEditId(null);
    setFormError(null);
    setFormData({
      dayOfWeek: defaultDay || todayMenuData?.day_of_week || 'MONDAY',
      mealTypeId: defaultMealTypeId || mealTypes[0]?.id || '',
      itemsDescription: '',
      specialItem: '',
      caloriesEst: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  // Open modal for Editing
  const handleOpenEditModal = (item, defaultDay = null) => {
    setIsEditing(true);
    setEditId(item.menu_id || item.id);
    setFormError(null);
    setFormData({
      dayOfWeek: defaultDay || item.day_of_week || todayMenuData?.day_of_week || 'MONDAY',
      mealTypeId: item.meal_type_id,
      itemsDescription: item.items_description || '',
      specialItem: item.special_item || '',
      caloriesEst: item.calories_est || '',
      isActive: item.is_active !== undefined ? item.is_active : true,
    });
    setModalOpen(true);
  };

  // Submit Menu Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.itemsDescription.trim()) {
      setFormError('Food items description is required');
      return;
    }
    if (!formData.mealTypeId) {
      setFormError('Please select a meal type');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        mealTypeId: parseInt(formData.mealTypeId, 10),
        dayOfWeek: formData.dayOfWeek,
        itemsDescription: formData.itemsDescription.trim(),
        specialItem: formData.specialItem.trim() || null,
        caloriesEst: formData.caloriesEst ? parseInt(formData.caloriesEst, 10) : null,
        isActive: formData.isActive,
      };

      if (isEditing && editId) {
        await updateMenuItem(editId, payload);
        setActionSuccess('Menu item updated successfully in MySQL');
      } else {
        await createMenuItem(payload);
        setActionSuccess('Menu item saved successfully to MySQL');
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Menu save error:', err);
      setFormError(err.response?.data?.message || 'Failed to save menu item to database');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Menu Item
  const handleDeleteItem = async (menuId) => {
    if (!window.confirm('Are you sure you want to remove this menu item?')) return;
    try {
      await deleteMenuItem(menuId);
      setActionSuccess('Menu item removed from MySQL');
      await loadData();
    } catch (err) {
      console.error('Menu delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete menu item');
    }
  };

  // Helpers for meal icon
  const getMealIcon = (mealName) => {
    const name = (mealName || '').toUpperCase();
    if (name.includes('BREAKFAST')) return <Coffee className="w-5 h-5 text-amber-600" />;
    if (name.includes('LUNCH')) return <Sun className="w-5 h-5 text-emerald-600" />;
    if (name.includes('SNACK')) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-teal-600" />;
  };

  const getMealBadgeStyle = (mealName) => {
    const name = (mealName || '').toUpperCase();
    if (name.includes('BREAKFAST')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (name.includes('LUNCH')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (name.includes('SNACK')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-teal-50 text-teal-700 border-teal-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-800 text-white rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="ml-2 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header Banner with Dining Context Image and Emerald Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none">
          <img
            src="/images/food/dining-banner.jpg"
            alt="Dining Cafeteria"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Dining & Nutritional Services</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              Food & Mess Management
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
              Daily dining menus, weekly rotating schedules, nutritional details, and meal operations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-sm font-medium transition-all backdrop-blur-md"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {canManage && (
              <button
                onClick={() => handleOpenAddModal()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                + Add Menu Item
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Menu
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'weekly'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Schedule
          </button>
        </div>

        {/* Date Selector for Today tab */}
        {activeTab === 'today' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Menu Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-card">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Fetching fresh dining menu from MySQL...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TODAY'S MENU */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Today's Menu ({todayMenuData?.day_of_week || 'TODAY'})
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Schedule for {selectedDate} • Grouped by 4 meal serving windows
                  </p>
                </div>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {(todayMenuData?.meals || []).map((meal) => (
                  <div
                    key={meal.meal_type_id}
                    className="relative flex flex-col justify-between bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all group"
                  >
                    <div>
                      {/* Header of Card */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            {getMealIcon(meal.meal_type)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 capitalize">{meal.meal_type}</h3>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {meal.start_time?.slice(0, 5)} - {meal.end_time?.slice(0, 5)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMealBadgeStyle(
                            meal.meal_type
                          )}`}
                        >
                          {meal.has_menu ? 'Configured' : 'Empty'}
                        </span>
                      </div>

                      {/* Items Description */}
                      <div className="mt-3 min-h-[90px]">
                        {meal.has_menu && meal.items_description ? (
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-normal">
                            {meal.items_description}
                          </p>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400 text-xs">
                            <Info className="w-5 h-5 mb-1 opacity-60" />
                            No menu item configured for today.
                          </div>
                        )}
                      </div>

                      {/* Special Item & Calories */}
                      {meal.has_menu && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          {meal.special_item && (
                            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] font-semibold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {meal.special_item}
                            </span>
                          )}
                          {meal.calories_est && (
                            <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                              <Flame className="w-3 h-3 text-rose-500" />
                              {meal.calories_est} kcal
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Staff */}
                    {canManage && (
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        {meal.has_menu ? (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(meal)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                              title="Edit Menu Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(meal.menu_id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                              title="Delete Menu Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenAddModal(todayMenuData?.day_of_week, meal.meal_type_id)}
                            className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Menu
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: WEEKLY SCHEDULE */}
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              {/* Day Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {DAYS_OF_WEEK.map((day) => {
                  const isCurrentDay = day === todayMenuData?.day_of_week;
                  const isSelected = day === selectedDay;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {day}
                      {isCurrentDay && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day Menu Card Grid */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedDay} Dining Schedule</span>
                      {selectedDay === todayMenuData?.day_of_week && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          Current Day
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Weekly rotating menu stored in MySQL database
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleOpenAddModal(selectedDay)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to {selectedDay}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(weeklyMenuData?.schedule?.[selectedDay] || []).map((meal) => (
                    <div
                      key={meal.meal_type_id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {getMealIcon(meal.meal_type)}
                            <span className="text-sm font-bold text-slate-900 capitalize">
                              {meal.meal_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {meal.start_time?.slice(0, 5)} - {meal.end_time?.slice(0, 5)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 leading-relaxed min-h-[60px] whitespace-pre-line">
                          {meal.items_description}
                        </div>

                        {meal.special_item && (
                          <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {meal.special_item}
                          </div>
                        )}
                      </div>

                      {canManage && meal.has_menu && (
                        <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(meal, selectedDay)}
                            className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ADD / EDIT MENU MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEditing ? 'Edit Menu Item' : 'Add Food Menu Item'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Persisted directly to MySQL <code className="text-emerald-700 font-semibold">food_menu</code> table
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Day of Week */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Day of Week <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Meal Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meal Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.mealTypeId}
                    onChange={(e) => setFormData({ ...formData, mealTypeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {mealTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.name} ({mt.start_time?.slice(0, 5)} - {mt.end_time?.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Food Items Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.itemsDescription}
                  onChange={(e) => setFormData({ ...formData, itemsDescription: e.target.value })}
                  placeholder="e.g. Idli with Sambar, Coconut Chutney & Medu Vada"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Special Item & Calories */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Special Item (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.specialItem}
                    onChange={(e) => setFormData({ ...formData, specialItem: e.target.value })}
                    placeholder="e.g. Filter Coffee / Sweet Pongal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calories Estimate (kcal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.caloriesEst}
                    onChange={(e) => setFormData({ ...formData, caloriesEst: e.target.value })}
                    placeholder="e.g. 450"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-50 border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-slate-700 font-medium">
                  Active (Display on resident dashboard)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to MySQL...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {isEditing ? 'Update Menu' : 'Save Menu Item'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
