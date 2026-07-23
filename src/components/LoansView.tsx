import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  CheckCircle,
  Undo2,
  Calendar,
  DollarSign,
  Calculator,
  ArrowRightLeft,
  X,
  FileText,
  History,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-react';
import { Loan, LoanPayment } from '../types';
import { formatMMK, formatCompactMMK, formatDateString } from '../lib/formatters';

interface LoansViewProps {
  loans: Loan[];
  currency: string;
  onRecordPayment: (loanId: string, amount?: number) => Promise<void> | void;
  onUndoPayment: (loanId: string) => Promise<void> | void;
  onCreateLoan: (data: {
    name: string;
    type?: 'borrowed' | 'lent';
    lender?: string;
    principal: number;
    interestRate: number;
    monthlyPayment: number;
    termMonths: number;
    startDate: string;
    notes?: string;
  }) => Promise<void> | void;
  onDeleteLoan: (loanId: string) => Promise<void> | void;
  onEditLoan: (loanId: string, data: {
    name: string;
    type?: 'borrowed' | 'lent';
    lender?: string;
    principal: number;
    interestRate: number;
    monthlyPayment: number;
    termMonths: number;
    startDate: string;
    status?: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  loans,
  currency,
  onRecordPayment,
  onUndoPayment,
  onCreateLoan,
  onDeleteLoan,
  onEditLoan,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'compare'>('loans');
  const [filterDirection, setFilterDirection] = useState<'all' | 'borrowed' | 'lent' | 'overdue'>('all');
  const [selectedAmortizationLoan, setSelectedAmortizationLoan] = useState<Loan | null>(null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);

  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null);

  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isCreatingLoan, setIsCreatingLoan] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);

  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState<'borrowed' | 'lent'>('borrowed');
  const [dueDay, setDueDay] = useState('25');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('13');
  const [monthlyPayment, setMonthlyPayment] = useState('1510000');
  const [termMonths, setTermMonths] = useState('120');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Edit states
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdatingLoan, setIsUpdatingLoan] = useState(false);

  const [editLoanName, setEditLoanName] = useState('');
  const [editLoanType, setEditLoanType] = useState<'borrowed' | 'lent'>('borrowed');
  const [editDueDay, setEditDueDay] = useState('25');
  const [editLender, setEditLender] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editInterestRate, setEditInterestRate] = useState('13');
  const [editMonthlyPayment, setEditMonthlyPayment] = useState('1510000');
  const [editTermMonths, setEditTermMonths] = useState('120');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editNotes, setEditNotes] = useState('');

  // Delete states
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingLoan, setIsDeletingLoan] = useState(false);

  const handleEditClick = (loan: Loan) => {
    setEditingLoan(loan);
    setEditLoanName(loan.name);
    setEditLoanType(loan.type || 'borrowed');
    setEditDueDay(String(loan.dueDay || 25));
    setEditLender(loan.lender || '');
    setEditPrincipal(String(loan.principal));
    setEditBalance(String(loan.balance));
    setEditInterestRate(String(loan.interestRate));
    setEditMonthlyPayment(String(loan.monthlyPayment));
    setEditTermMonths(String(loan.termMonths));
    setEditStartDate(loan.startDate ? loan.startDate.split('T')[0] : '');
    setEditStatus(loan.status || 'active');
    setEditNotes(loan.notes || '');
    setIsEditOpen(true);
  };

  const handleSaveEditLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || isUpdatingLoan) return;

    const p = parseFloat(editPrincipal);
    const bal = parseFloat(editBalance);
    const pay = parseFloat(editMonthlyPayment);
    if (!editLoanName.trim() || !p || !pay) return;

    setIsUpdatingLoan(true);
    try {
      await onEditLoan(editingLoan.id, {
        name: editLoanName.trim(),
        type: editLoanType,
        dueDay: parseInt(editDueDay) || 25,
        lender: editLender.trim(),
        principal: p,
        balance: isNaN(bal) ? p : bal,
        interestRate: parseFloat(editInterestRate) || 0,
        monthlyPayment: pay,
        termMonths: parseInt(editTermMonths) || 12,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : editingLoan.startDate,
        status: editStatus,
        notes: editNotes,
      });
      setIsEditOpen(false);
      setEditingLoan(null);
    } finally {
      setIsUpdatingLoan(false);
    }
  };

  const handleDeleteClick = (loan: Loan) => {
    setDeletingLoan(loan);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLoan || isDeletingLoan) return;
    setIsDeletingLoan(true);
    try {
      await onDeleteLoan(deletingLoan.id);
      setIsDeleteConfirmOpen(false);
      setDeletingLoan(null);
    } finally {
      setIsDeletingLoan(false);
    }
  };

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const totalBorrowedBalance = loans
    .filter((l) => (l.type || 'borrowed') === 'borrowed' && l.status === 'active')
    .reduce((sum, l) => sum + l.balance, 0);

  const totalLentBalance = loans
    .filter((l) => l.type === 'lent' && l.status === 'active')
    .reduce((sum, l) => sum + l.balance, 0);

  // Compute Overdue Loans
  const now = new Date();
  const todayDay = now.getDate();

  const overdueLoans = loans.filter((l) => {
    if (l.status !== 'active' || l.balance <= 0) return false;
    const isCurrentMonthPaid = l.currentMonthPaid || (l.payments && l.payments.some((p) => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }));
    const dDay = l.dueDay || 25;
    return !isCurrentMonthPaid && (l.isOverdue || todayDay >= dDay);
  });

  const filteredLoans = loans.filter((l) => {
    const lType = l.type || 'borrowed';
    if (filterDirection === 'all') return true;
    if (filterDirection === 'borrowed') return lType === 'borrowed';
    if (filterDirection === 'lent') return lType === 'lent';
    if (filterDirection === 'overdue') {
      const isCurrentMonthPaid = l.currentMonthPaid || (l.payments && l.payments.some((p) => {
        const d = new Date(p.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }));
      const dDay = l.dueDay || 25;
      return l.status === 'active' && l.balance > 0 && !isCurrentMonthPaid && (l.isOverdue || todayDay >= dDay);
    }
    return true;
  });

  const fetchAmortization = async (loan: Loan) => {
    setSelectedAmortizationLoan(loan);
    try {
      const res = await fetch(`/api/loans/${loan.id}/amortization`);
      const data = await res.json();
      setAmortizationSchedule(data.schedule || []);
    } catch {
      // Client-side fallback amortization calculation
      let tempBalance = loan.principal;
      const monthlyRate = loan.interestRate / 100 / 12;
      const schedule = [];
      let currentMonth = new Date(loan.startDate);

      for (let m = 1; m <= loan.termMonths && tempBalance > 0; m++) {
        const interest = Math.round(tempBalance * monthlyRate);
        const principalPart = Math.min(tempBalance, loan.monthlyPayment - interest);
        tempBalance = Math.max(0, tempBalance - principalPart);

        schedule.push({
          monthNumber: m,
          date: currentMonth.toISOString(),
          payment: loan.monthlyPayment,
          principalPart,
          interestPart: interest,
          remainingBalance: tempBalance,
        });

        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      setAmortizationSchedule(schedule);
    }
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(principal);
    const pay = parseFloat(monthlyPayment);
    if (!loanName.trim() || !p || !pay || isCreatingLoan) return;

    setIsCreatingLoan(true);
    try {
      await onCreateLoan({
        name: loanName.trim(),
        type: loanType,
        dueDay: parseInt(dueDay) || 25,
        lender: lender.trim(),
        principal: p,
        interestRate: parseFloat(interestRate) || 0,
        monthlyPayment: pay,
        termMonths: parseInt(termMonths) || 12,
        startDate: new Date(startDate).toISOString(),
        notes,
      });

      setIsAddLoanOpen(false);
      setLoanName('');
      setLender('');
      setPrincipal('');
    } finally {
      setIsCreatingLoan(false);
    }
  };

  const handleRecordPaymentInternal = async (loanId: string) => {
    if (processingLoanId) return;
    setProcessingLoanId(loanId);
    try {
      await onRecordPayment(loanId);
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleUndoPaymentInternal = async (loanId: string) => {
    if (processingLoanId) return;
    setProcessingLoanId(loanId);
    try {
      await onUndoPayment(loanId);
    } finally {
      setProcessingLoanId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Loans & Money Owed</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track money you borrowed (liabilities) and money you lent to others (assets) in {currency}.
          </p>
        </div>
        <button
          onClick={() => {
            setLoanType('borrowed');
            setIsAddLoanOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan Record</span>
        </button>
      </div>

      {/* Summary Stats Cards: Borrowed vs Lent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Borrowed (Money I Owe)
            </span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">
              {formatMMK(totalBorrowedBalance, currency)}
            </p>
          </div>
          <div className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
            {loans.filter((l) => (l.type || 'borrowed') === 'borrowed' && l.status === 'active').length} Active
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Lent (Money Owed to Me)
            </span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">
              {formatMMK(totalLentBalance, currency)}
            </p>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            {loans.filter((l) => l.type === 'lent' && l.status === 'active').length} Active
          </div>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('loans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'loans'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Active Loans ({loans.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('compare')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'compare'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Loan Cost Comparison</span>
          </button>
        </div>

        {activeSubTab === 'loans' && (
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                filterDirection === 'all'
                  ? 'bg-slate-800 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({loans.length})
            </button>
            <button
              onClick={() => setFilterDirection('borrowed')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                filterDirection === 'borrowed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Borrowed ({loans.filter((l) => (l.type || 'borrowed') === 'borrowed').length})
            </button>
            <button
              onClick={() => setFilterDirection('lent')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                filterDirection === 'lent'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Lent ({loans.filter((l) => l.type === 'lent').length})
            </button>
            <button
              onClick={() => setFilterDirection('overdue')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                filterDirection === 'overdue'
                  ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30'
                  : overdueLoans.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Overdue ({overdueLoans.length})</span>
            </button>
          </div>
        )}
      </div>

      {activeSubTab === 'loans' ? (
        filteredLoans.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLoans.map((loan) => {
              const isLent = loan.type === 'lent';
              const monthlyRate = loan.interestRate / 100 / 12;
              const approxInterestPart = Math.round(loan.balance * monthlyRate);
              const approxPrincipalPart = Math.max(0, loan.monthlyPayment - approxInterestPart);

              const isProcessingThisLoan = processingLoanId === loan.id;

              // Check if paid in current month
              const isCurrentMonthPaid = loan.currentMonthPaid || (loan.payments && loan.payments.some((p) => {
                const d = new Date(p.paymentDate);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }));

              const isFullyPaid = loan.status === 'paid' || loan.balance <= 0;
              const dDay = loan.dueDay || 25;
              const isOverdue = !isFullyPaid && !isCurrentMonthPaid && (loan.isOverdue || new Date().getDate() >= dDay);

              return (
                <div
                  key={loan.id}
                  className={`bg-slate-900 border rounded-2xl p-6 shadow-xl space-y-5 transition-all flex flex-col justify-between ${
                    isOverdue
                      ? 'border-rose-500/80 shadow-rose-900/20 ring-1 ring-rose-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Overdue Card Alert Header */}
                    {isOverdue && (
                      <div className="mb-4 bg-rose-500/20 border border-rose-500/40 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-rose-300">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                          <span>{isLent ? '🚨 OVERDUE COLLECTION PENDING' : '🚨 OVERDUE PAYMENT REQUIRED'}</span>
                        </span>
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
                          Due: {dDay}th
                        </span>
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded border ${
                              isLent
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            }`}
                          >
                            {isLent ? '🟢 Lent (Owed to Me)' : '🔴 Borrowed (I Owe)'}
                          </span>
                          {loan.lender && (
                            <span className="text-[10px] text-slate-300 font-medium bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {isLent ? 'Borrower' : 'Lender'}: {loan.lender}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Since {formatDateString(loan.startDate)}</span>
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-white mt-2">{loan.name}</h3>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                            isFullyPaid
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isOverdue
                              ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : loan.status}
                        </span>

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(loan)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 transition-colors"
                            title="Edit Loan"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(loan)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 transition-colors"
                            title="Delete Loan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Balance vs Principal Cards */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                        <p className="text-[11px] text-slate-400">
                          {isLent ? 'Remaining Owed to Me' : 'Remaining Balance'}
                        </p>
                        <p className={`text-lg font-bold mt-0.5 ${isLent ? 'text-emerald-400' : 'text-white'}`}>
                          {formatMMK(loan.balance, currency)}
                        </p>
                      </div>

                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                        <p className="text-[11px] text-slate-400">
                          {isLent ? 'Original Lent Amount' : 'Original Principal'}
                        </p>
                        <p className="text-lg font-bold text-slate-300 mt-0.5">
                          {formatCompactMMK(loan.principal, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Amortization / Collection Split Metrics */}
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-300 font-semibold">
                        <span>{isLent ? 'Monthly Expected Collection:' : 'Monthly Payment:'}</span>
                        <span className={isLent ? 'text-emerald-400' : 'text-amber-400'}>
                          {formatMMK(loan.monthlyPayment, currency)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>Payment Due Date:</span>
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          Every {dDay}th of month
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>Interest Rate ({loan.interestRate}% p.a.):</span>
                        <span className={loan.interestRate > 0 ? 'text-rose-400' : 'text-slate-400'}>
                          {loan.interestRate > 0 ? formatCompactMMK(approxInterestPart, currency) : 'Interest-free (0%)'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>Est. Principal Reduction:</span>
                        <span className="text-emerald-400">{formatCompactMMK(approxPrincipalPart, currency)}</span>
                      </div>
                    </div>

                    {/* Current Month Status Notification Banner */}
                    {isCurrentMonthPaid && !isFullyPaid && (
                      <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {isLent
                            ? `Current month (${currentMonthName}) collection recorded!`
                            : `Current month (${currentMonthName}) payment recorded!`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Loan Controls */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRecordPaymentInternal(loan.id)}
                        disabled={isFullyPaid || isCurrentMonthPaid || isProcessingThisLoan}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                          isCurrentMonthPaid
                            ? 'bg-emerald-800/40 text-emerald-300 border border-emerald-700/50 cursor-not-allowed'
                            : isLent
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                        }`}
                      >
                        {isProcessingThisLoan ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Processing...</span>
                          </>
                        ) : isCurrentMonthPaid ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{isLent ? 'Collected for Current Month' : 'Paid for Current Month'}</span>
                          </>
                        ) : isFullyPaid ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>{isLent ? 'Fully Collected' : 'Loan Fully Paid Off'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>{isLent ? 'Record Payment Received' : 'Record Monthly Payment'}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleUndoPaymentInternal(loan.id)}
                        disabled={isProcessingThisLoan}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors disabled:opacity-50"
                        title="Undo Last Record"
                      >
                        {isProcessingThisLoan ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Undo2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setHistoryLoan(loan)}
                        className="py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5 text-indigo-400" />
                        <span>History Log</span>
                      </button>

                      <button
                        onClick={() => fetchAmortization(loan)}
                        className="py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Schedule</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <Landmark className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No loan records found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no loan or lending records in this category yet. Click "Add Loan Record" to record money you borrowed or lent.
            </p>
          </div>
        )
      ) : (
        /* Loan Comparison Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-white">Loan Cost & Total Interest Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Loan Name</th>
                  <th className="py-3 px-3">Since Date</th>
                  <th className="py-3 px-3">Principal</th>
                  <th className="py-3 px-3">Interest Rate</th>
                  <th className="py-3 px-3">Monthly Payment</th>
                  <th className="py-3 px-3">Total Cost</th>
                  <th className="py-3 px-3 text-right">Total Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loans.map((loan) => {
                  const totalPayment = loan.monthlyPayment * loan.termMonths;
                  const totalInterest = totalPayment - loan.principal;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-white">{loan.name}</td>
                      <td className="py-3.5 px-3 text-slate-400">{formatDateString(loan.startDate)}</td>
                      <td className="py-3.5 px-3 text-slate-300">{formatMMK(loan.principal, currency)}</td>
                      <td className="py-3.5 px-3 text-amber-400 font-bold">{loan.interestRate}% p.a.</td>
                      <td className="py-3.5 px-3 text-slate-200">{formatMMK(loan.monthlyPayment, currency)}</td>
                      <td className="py-3.5 px-3 text-slate-300">{formatMMK(totalPayment, currency)}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-rose-400">
                        {formatMMK(totalInterest, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History Log Modal */}
      {historyLoan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">{historyLoan.name} Payment History</h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-semibold">
                    Since {formatDateString(historyLoan.startDate)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lender: {historyLoan.lender || 'Bank'} • Original Principal: {formatMMK(historyLoan.principal, currency)}
                </p>
              </div>
              <button
                onClick={() => setHistoryLoan(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History Summary Header */}
            <div className="grid grid-cols-3 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Total Paid</p>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">
                  {formatMMK(historyLoan.totalPaid, currency)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Current Balance</p>
                <p className="font-bold text-amber-400 text-sm mt-0.5">
                  {formatMMK(historyLoan.balance, currency)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Active Since</p>
                <p className="font-bold text-slate-200 text-xs mt-1">
                  {formatDateString(historyLoan.startDate)}
                </p>
              </div>
            </div>

            {/* Payment List */}
            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
              {((historyLoan.payments || historyLoan.loanPayments) && (historyLoan.payments || historyLoan.loanPayments)!.length > 0) ? (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Principal</th>
                      <th className="py-2.5 px-3">Interest</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(historyLoan.payments || historyLoan.loanPayments)!.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-300 font-medium">
                          {formatDateString(p.paymentDate)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-400">
                          {formatMMK(p.amount, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {formatMMK(p.principalPart, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-rose-400">
                          {formatMMK(p.interestPart, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                          {formatMMK(p.remainingAfter, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-400">No recorded payments yet</p>
                  <p>Payments recorded for this loan will appear here in chronological log.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  handleUndoPaymentInternal(historyLoan.id);
                  setHistoryLoan(null);
                }}
                disabled={(historyLoan.payments || historyLoan.loanPayments || []).length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo Last Payment</span>
              </button>

              <button
                onClick={() => setHistoryLoan(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amortization Schedule Modal */}
      {selectedAmortizationLoan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Amortization Schedule</h3>
                <p className="text-xs text-slate-400">
                  {selectedAmortizationLoan.name} • {selectedAmortizationLoan.interestRate}% Interest • {selectedAmortizationLoan.termMonths} Months
                </p>
              </div>
              <button
                onClick={() => setSelectedAmortizationLoan(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Month #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Principal Part</th>
                    <th className="py-2.5 px-3">Interest Part</th>
                    <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {amortizationSchedule.map((row) => (
                    <tr key={row.monthNumber} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-semibold text-slate-400">#{row.monthNumber}</td>
                      <td className="py-2 px-3 text-slate-300">{formatDateString(row.date)}</td>
                      <td className="py-2 px-3 text-amber-400 font-semibold">{formatMMK(row.payment, currency)}</td>
                      <td className="py-2 px-3 text-emerald-400">{formatMMK(row.principalPart, currency)}</td>
                      <td className="py-2 px-3 text-rose-400">{formatMMK(row.interestPart, currency)}</td>
                      <td className="py-2 px-3 text-right font-bold text-white">
                        {formatMMK(row.remainingBalance, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setSelectedAmortizationLoan(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Loan Modal */}
      {isAddLoanOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Add Loan Record</h3>
              <button
                onClick={() => setIsAddLoanOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Loan Category / Direction *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoanType('borrowed');
                      if (interestRate === '0') setInterestRate('13');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      loanType === 'borrowed'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔴 Borrowed (I Owe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoanType('lent');
                      if (interestRate === '13') setInterestRate('0');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      loanType === 'lent'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🟢 Lent (Owed to Me)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {loanType === 'lent' ? 'Lent Title / Reference *' : 'Loan Title *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    loanType === 'lent'
                      ? 'e.g. Loan to Ko Aung, Emergency Cash to Sister'
                      : 'e.g. KBZ Housing Loan, AYA Car Loan'
                  }
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {loanType === 'lent' ? 'Borrower Person / Name' : 'Lender / Bank / Person'}
                </label>
                <input
                  type="text"
                  placeholder={
                    loanType === 'lent'
                      ? 'e.g. Aung Aung (Friend), Mg Mg (Relative)'
                      : 'e.g. KBZ Bank, AYA Bank, Daw Mya'
                  }
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {loanType === 'lent' ? `Lent Amount (${currency}) *` : `Principal (${currency}) *`}
                  </label>
                  <input
                    type="number"
                    placeholder="10000000"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={loanType === 'lent' ? '0' : '13'}
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {loanType === 'lent' ? 'Monthly Collection *' : 'Fixed Monthly Payment *'}
                  </label>
                  <input
                    type="number"
                    placeholder="500000"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Term (Months)</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date / Since</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Due Day (1-31) *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="25"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddLoanOpen(false)}
                  disabled={isCreatingLoan}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLoan}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg disabled:opacity-50 flex items-center gap-2 ${
                    loanType === 'lent' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isCreatingLoan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loanType === 'lent' ? 'Save Lent Record' : 'Save Borrowed Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {isEditOpen && editingLoan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Edit Loan Record</h3>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingLoan(null);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Loan Category / Direction *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditLoanType('borrowed')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editLoanType === 'borrowed'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔴 Borrowed (I Owe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditLoanType('lent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editLoanType === 'lent'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🟢 Lent (Owed to Me)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editLoanType === 'lent' ? 'Lent Title / Reference *' : 'Loan Title *'}
                </label>
                <input
                  type="text"
                  value={editLoanName}
                  onChange={(e) => setEditLoanName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editLoanType === 'lent' ? 'Borrower Person / Name' : 'Lender / Bank / Person'}
                </label>
                <input
                  type="text"
                  value={editLender}
                  onChange={(e) => setEditLender(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editLoanType === 'lent' ? `Lent Amount (${currency}) *` : `Principal (${currency}) *`}
                  </label>
                  <input
                    type="number"
                    value={editPrincipal}
                    onChange={(e) => setEditPrincipal(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Remaining Balance ({currency})
                  </label>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editInterestRate}
                    onChange={(e) => setEditInterestRate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editLoanType === 'lent' ? 'Monthly Collection *' : 'Fixed Monthly Payment *'}
                  </label>
                  <input
                    type="number"
                    value={editMonthlyPayment}
                    onChange={(e) => setEditMonthlyPayment(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Term (Months)</label>
                  <input
                    type="number"
                    value={editTermMonths}
                    onChange={(e) => setEditTermMonths(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Since Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Day (1-31) *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional remarks..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingLoan(null);
                  }}
                  disabled={isUpdatingLoan}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLoan}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg disabled:opacity-50 flex items-center gap-2 ${
                    editLoanType === 'lent' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isUpdatingLoan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && deletingLoan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-bold text-base text-white">Delete Loan Record?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete the loan record <span className="font-bold text-white">"{deletingLoan.name}"</span>?
              This will permanently remove the record and all associated amortization payments. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingLoan(null);
                }}
                disabled={isDeletingLoan}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingLoan}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingLoan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
