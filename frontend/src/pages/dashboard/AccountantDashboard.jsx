import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Receipt,
  CreditCard,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { getAccountantDashboard } from '../../services/dashboardService';
import { StatCard, DashboardHeader, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

const METHOD_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAccountantDashboard();
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to fetch accountant dashboard');
      }
    } catch (err) {
      console.error('Failed to load accountant dashboard data:', err);
      setError(err.message || 'Failed to load financial records from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 45000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const overview = data?.overview || {};
  const payments = data?.payments || {};
  const feeStructures = data?.feeStructures || [];
  const notifications = data?.notifications || {};

  // Charts data
  const feeStatusPieData = [
    { name: 'Collected', value: overview.totalCollected || 0, color: '#10b981' },
    { name: 'Pending', value: overview.totalPending || 0, color: '#f59e0b' },
    { name: 'Overdue', value: overview.overdueAmount || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const paymentMethodData = (payments.byMethod || []).map((m) => ({
    name: m.payment_method?.replace(/_/g, ' ') || 'Other',
    amount: Number(m.totalAmount) || 0,
    count: m.count || 0,
  }));

  const monthlyTrendData = (payments.monthlyTrends || []).map((m) => ({
    name: m.monthLabel || m.monthYear,
    Amount: Number(m.totalAmount) || 0,
    Count: m.transactionCount || 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      <DashboardHeader
        title="Financial & Accounts Hub"
        subtitle="Fee collection ledger, student dues audit, and revenue realization"
        roleName="ACCOUNTANT"
        lastUpdated={lastUpdated}
        onRefresh={fetchStats}
        loading={loading}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Billed"
          value={`₹${(overview.totalBilled || 0).toLocaleString()}`}
          icon={Receipt}
          color="indigo"
          loading={loading}
          subtitle={`${overview.totalInvoices || 0} Total Invoices`}
          badge="Term Invoices"
          badgeType="info"
          onClick={() => navigate('/fees')}
        />

        <StatCard
          title="Realized Collection"
          value={`₹${(overview.totalCollected || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          loading={loading}
          subtitle={`Realization Rate: ${overview.collectionPercentage || 0}%`}
          badge={`${overview.paidInvoices || 0} Fully Paid`}
          badgeType="success"
          onClick={() => navigate('/fees')}
        />

        <StatCard
          title="Outstanding Dues"
          value={`₹${(overview.totalPending || 0).toLocaleString()}`}
          icon={CreditCard}
          color="amber"
          loading={loading}
          subtitle={`${overview.pendingInvoices || 0} Unpaid / Partial`}
          badge={`₹${(overview.overdueAmount || 0).toLocaleString()} Overdue`}
          badgeType={overview.overdueAmount > 0 ? 'danger' : 'warning'}
          onClick={() => navigate('/fees')}
        />

        <StatCard
          title="Today's Receipts"
          value={`₹${(payments.todayAmount || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="sky"
          loading={loading}
          subtitle={`${payments.todayCount || 0} Transactions Today`}
          badge="Daily Counter"
          badgeType="info"
          onClick={() => navigate('/fees')}
        />
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Breakdown PieChart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fee Realization Ratio</h3>
              <p className="text-xs text-slate-500">Paid vs Pending vs Overdue balance</p>
            </div>
          </div>
          {feeStatusPieData.length > 0 ? (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeStatusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {feeStatusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DashboardEmptyState message="No fee dues issued yet" />
          )}
        </div>

        {/* Payment Methods Distribution */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Collection by Payment Mode</h3>
              <p className="text-xs text-slate-500">UPI, Net Banking, Card, Cash</p>
            </div>
          </div>
          {paymentMethodData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DashboardEmptyState message="No payment transactions logged" />
          )}
        </div>
      </div>

      {/* Recent Payments Ledger (Live MySQL) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Recent Transaction Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">Live payment receipts from MySQL fee_payments</p>
          </div>
          <button
            onClick={() => navigate('/fees')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            Manage Fees
          </button>
        </div>

        {payments.recent && payments.recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Bill / Term</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.recent.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{p.receipt_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {p.student_name}
                      <span className="block text-[10px] text-slate-400 font-normal">{p.roll_number}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.term_name || p.bill_number || 'N/A'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      ₹{Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700">
                        {p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashboardEmptyState message="No payment transactions logged in database" />
        )}
      </div>
    </div>
  );
}
