import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentFees, getStudentFeeSummary } from '../../services/feeService';
import { getPaymentById, getAllPayments } from '../../services/paymentService';
import {
  CreditCard,
  Receipt,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Printer,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  X,
  Building2,
  Layers,
} from 'lucide-react';

export default function MyFeesPage() {
  const { user } = useAuth();

  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab: 'BILLS' or 'PAYMENTS'
  const [activeTab, setActiveTab] = useState('BILLS');
  const [statusFilter, setStatusFilter] = useState('');

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Format currency
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Student Fees
      const feesRes = await getStudentFees({ status: statusFilter, limit: 100 });
      if (feesRes.data?.data) {
        setFees(feesRes.data.data);
      }

      // 2. Fetch Student Payments
      const payRes = await getAllPayments({ limit: 100 });
      if (payRes.data?.data) {
        setPayments(payRes.data.data);
      }

      // 3. If student has studentId in user or we can fetch summary
      if (user?.studentId) {
        setSummaryLoading(true);
        try {
          const sumRes = await getStudentFeeSummary(user.studentId);
          if (sumRes.data?.data) {
            setSummary(sumRes.data.data);
          }
        } catch (sumErr) {
          console.error('Failed to load student summary:', sumErr);
        } finally {
          setSummaryLoading(false);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch personal fee details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Open Receipt Modal
  const handleViewReceipt = async (paymentId) => {
    setLoadingReceipt(true);
    setReceiptModalOpen(true);
    try {
      const res = await getPaymentById(paymentId);
      if (res.data?.data) {
        setReceiptData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load receipt:', err);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      case 'WAIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Waived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  // Calculate local fallback totals if summary not yet loaded
  const totalBilled = summary?.total_fees ?? fees.reduce((acc, f) => acc + (f.amount_due - f.discount), 0);
  const totalPaid = summary?.total_paid ?? fees.reduce((acc, f) => acc + f.amount_paid, 0);
  const totalOutstanding = summary?.total_outstanding ?? fees.reduce((acc, f) => acc + f.outstanding_balance, 0);
  const overdueCount = summary?.overdue_bills ?? fees.filter((f) => f.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Student Financial Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            My Fees & Receipts
          </h1>
          <p className="text-blue-200 text-sm mt-1 max-w-xl">
            View your hostel and mess fee dues, payment history, and download official verified receipts.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-sm transition border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Invoiced</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatINR(totalBilled)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {fees.length} Total Bill{fees.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Paid</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(totalPaid)}
            </div>
            <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              {payments.length} Transaction{payments.length !== 1 ? 's' : ''} Completed
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Outstanding Due</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatINR(totalOutstanding)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {totalOutstanding > 0 ? 'Payable at Accounts Desk' : 'All Clear! No Dues'}
            </div>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue Invoices</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {overdueCount}
            </div>
            <div className="text-xs text-rose-500 mt-1">
              {overdueCount > 0 ? 'Payment past due date' : 'Zero Overdue Bills'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('BILLS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'BILLS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Fee Invoices ({fees.length})
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'PAYMENTS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Payment Receipts ({payments.length})
          </button>
        </div>

        {/* Status Filter for Bills Tab */}
        {activeTab === 'BILLS' && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label className="text-xs text-slate-500 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Invoices</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FEE INVOICES LIST */}
      {/* ========================================================================= */}
      {activeTab === 'BILLS' && (
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <span>Loading your fee invoices from database...</span>
            </div>
          ) : error ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-rose-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <span>{error}</span>
            </div>
          ) : fees.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No fee invoices found</p>
              <p className="text-xs text-slate-400 mt-1">You do not have any pending fee bills at this time.</p>
            </div>
          ) : (
            fees.map((fee) => (
              <div
                key={fee.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-blue-200 dark:hover:border-slate-700 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {fee.fee_type_name}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {fee.bill_number}
                      </span>
                      {renderStatusBadge(fee.status)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {fee.term_name} · Academic Year {fee.academic_year} · Due Date: {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs text-slate-400">Total Billed</div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatINR(fee.amount_due - fee.discount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Paid</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(fee.amount_paid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Balance Due</div>
                      <div className={`font-bold text-sm ${fee.outstanding_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        {formatINR(fee.outstanding_balance)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note for Student */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hostel: {fee.hostel_name || 'Assigned Hostel'} (Room {fee.room_number || 'N/A'})</span>
                  </div>
                  {fee.outstanding_balance > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Please settle balance of {formatINR(fee.outstanding_balance)} at the Accounts Office.
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid & Verified
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYMENT RECEIPTS HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Fee Category</th>
                  <th className="py-3.5 px-4">Bill No</th>
                  <th className="py-3.5 px-4 text-right">Amount Paid</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <span>Loading payment receipts...</span>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <span>No payment transactions found in history.</span>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {p.receipt_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {p.fee_type_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {p.bill_number}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(p.payment_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleViewReceipt(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium text-xs transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95">
            {loadingReceipt || !receiptData ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                <span>Loading receipt details...</span>
              </div>
            ) : (
              <div>
                {/* Print Header */}
                <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Fee Receipt
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    HOSTEL FOOD & ACCOMMODATION
                  </h2>
                  <p className="text-xs text-slate-500">Student Copy · Payment Acknowledgment</p>
                </div>

                {/* Receipt Metadata */}
                <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Receipt No:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">{receiptData.receipt_number}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Payment Date:</span>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {new Date(receiptData.payment_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Student & Bill Details */}
                <div className="py-3 border-b border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Student Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{receiptData.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Roll Number:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{receiptData.roll_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-slate-800 dark:text-slate-200">{receiptData.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bill Number:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{receiptData.bill_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fee Category:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{receiptData.fee_type_name}</span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl my-4 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{receiptData.payment_method}</span>
                  </div>
                  {receiptData.transaction_id && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Ref / Transaction ID:</span>
                      <span className="font-mono text-slate-900 dark:text-white">{receiptData.transaction_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Previous Balance:</span>
                    <span>{formatINR(receiptData.previous_balance)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-emerald-600 dark:text-emerald-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span>Amount Paid:</span>
                    <span>{formatINR(receiptData.amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-1">
                    <span>Remaining Balance:</span>
                    <span className={receiptData.remaining_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {formatINR(receiptData.remaining_balance)}
                    </span>
                  </div>
                </div>

                {/* Footer Notes & Collector */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Processed by: {receiptData.collected_by_name || 'Accounts Office'}</span>
                  <span className="text-emerald-600 font-semibold">Status: SUCCESS</span>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => setReceiptModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 font-semibold text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
