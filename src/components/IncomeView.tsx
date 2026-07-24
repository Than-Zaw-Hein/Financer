import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  CheckCircle2,
  Clock,
  Briefcase,
  DollarSign,
  Edit2,
  Trash2,
  X,
  Loader2,
  ArrowRightLeft,
  Calendar,
  Building2,
  MinusCircle
} from 'lucide-react';
import { IncomeSource, Income, Loan } from '../types';
import { formatMMK, formatCompactMMK, formatDateString } from '../lib/formatters';

interface IncomeViewProps {
  incomeSources: (IncomeSource & { currentIncome?: Income | null })[];
  recordedIncomes: Income[];
  loans?: Loan[];
  currency: string;
  onRecordIncome: (
    sourceId: string,
    payload: {
      amount: number;
      receivedDate?: string;
      targetMonth?: number;
      targetYear?: number;
      deductionAmount?: number;
      deductionNote?: string;
      linkedLoanId?: string;
      notes?: string;
       incomeId?: string;
    }
  ) => Promise<void> | void;
  onCreateSource: (sourceData: {
    name: string;
    amount: number;
    type: 'salary' | 'freelance' | 'business' | 'other';
    notes?: string;
  }) => Promise<void> | void;
  onDeleteSource: (sourceId: string) => void;
  onDeleteRecord?: (incomeId: string) => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({
  incomeSources,
  recordedIncomes,
  loans = [],
  currency,
  onRecordIncome,
  onCreateSource,
  onDeleteSource,
  onDeleteRecord,
}) => {
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceType, setSourceType] = useState<'salary' | 'freelance' | 'business' | 'other'>('salary');
  const [sourceNotes, setSourceNotes] = useState('');
  const [isCreatingSource, setIsCreatingSource] = useState(false);
const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  // Record modal state
  const [recordingSource, setRecordingSource] = useState<(IncomeSource & { currentIncome?: Income | null }) | null>(null);
  const [customRecordAmount, setCustomRecordAmount] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [hasDeduction, setHasDeduction] = useState<boolean>(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [deductionAmount, setDeductionAmount] = useState<string>('');
  const [deductionNote, setDeductionNote] = useState<string>('');
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [isRecordingIncome, setIsRecordingIncome] = useState(false);

  const totalExpected = incomeSources.reduce((sum, s) => sum + s.amount, 0);
  const totalReceived = recordedIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalDeductions = recordedIncomes.reduce((sum, i) => sum + (i.deductionAmount || 0), 0);
  const totalNetTakeHome = totalReceived - totalDeductions;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleOpenRecord = (source: IncomeSource & { currentIncome?: Income | null }) => {
    setRecordingSource(source);
    
    if (source.currentIncome) {
      const rec = source.currentIncome;
      setCustomRecordAmount(rec.amount.toString());
      setReceivedDate(rec.receivedDate ? rec.receivedDate.split('T')[0] : new Date().toISOString().split('T')[0]);
      setTargetMonth(rec.targetMonth || new Date().getMonth() + 1);
      setTargetYear(rec.targetYear || new Date().getFullYear());
      
      const hasDed = !!(rec.deductionAmount && rec.deductionAmount > 0);
      setHasDeduction(hasDed);
      if (hasDed) {
        setDeductionAmount((rec.deductionAmount || 0).toString());
        setDeductionNote(rec.deductionNote || '');
        setSelectedLoanId(rec.linkedLoanId || '');
      } else {
        const activeBorrowedLoans = loans.filter((l) => l.status === 'active' && (l.type === 'borrowed' || !l.type));
        if (activeBorrowedLoans.length > 0) {
          const loan = activeBorrowedLoans[0];
          setSelectedLoanId(loan.id);
          setDeductionAmount(loan.monthlyPayment.toString());
          setDeductionNote(`${loan.name} Direct Deduction`);
        } else {
          setSelectedLoanId('');
          setDeductionAmount('');
          setDeductionNote('');
        }
      }
      setRecordNotes(rec.notes || '');
    } else {
      setCustomRecordAmount(source.amount.toString());
      setReceivedDate(new Date().toISOString().split('T')[0]);
      
      // Default target month: if receiving late in month (e.g. after 20th), default target to next month
      const today = new Date();
      let defaultTargetM = today.getMonth() + 1;
      let defaultTargetY = today.getFullYear();
      if (today.getDate() >= 20) {
        if (defaultTargetM === 12) {
          defaultTargetM = 1;
          defaultTargetY += 1;
        } else {
          defaultTargetM += 1;
        }
      }
      setTargetMonth(defaultTargetM);
      setTargetYear(defaultTargetY);

      // Pre-select first active borrowed loan if exists
      const activeBorrowedLoans = loans.filter((l) => l.status === 'active' && (l.type === 'borrowed' || !l.type));
      if (activeBorrowedLoans.length > 0) {
        const loan = activeBorrowedLoans[0];
        setSelectedLoanId(loan.id);
        setDeductionAmount(loan.monthlyPayment.toString());
        setDeductionNote(`${loan.name} Direct Deduction`);
      } else {
        setSelectedLoanId('');
        setDeductionAmount('');
        setDeductionNote('');
      }
      setHasDeduction(false);
      setRecordNotes('');
    }
  };

  const handleConfirmRecord = async () => {
    if (!recordingSource || isRecordingIncome) return;
    const grossAmt = parseFloat(customRecordAmount);
    if (!grossAmt || grossAmt <= 0) return;

    const parsedDeduction = hasDeduction ? parseFloat(deductionAmount) || 0 : 0;

    setIsRecordingIncome(true);
    try {
      await onRecordIncome(recordingSource.id, {
        amount: grossAmt,
        receivedDate,
        targetMonth,
        targetYear,
        deductionAmount: parsedDeduction,
        deductionNote: hasDeduction ? deductionNote : undefined,
        linkedLoanId: hasDeduction ? selectedLoanId : undefined,
        notes: recordNotes,
          incomeId: recordingSource.currentIncome?.id,
      });
      setRecordingSource(null);
    } finally {
      setIsRecordingIncome(false);
    }
  };

  const handleSaveNewSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(sourceAmount);
    if (!sourceName.trim() || !amt || isCreatingSource) return;

    setIsCreatingSource(true);
    try {
      await onCreateSource({
        name: sourceName.trim(),
        amount: amt,
        type: sourceType,
        notes: sourceNotes,
      });

      setSourceName('');
      setSourceAmount('');
      setSourceNotes('');
      setIsAddSourceOpen(false);
    } finally {
      setIsCreatingSource(false);
    }
  };

  const grossCalculated = parseFloat(customRecordAmount) || 0;
  const deductionCalculated = hasDeduction ? parseFloat(deductionAmount) || 0 : 0;
  const netCalculated = Math.max(0, grossCalculated - deductionCalculated);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Income Sources & Tracking</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage expected income streams, mark early salary payouts, and auto-link loan payment deductions in {currency}.
          </p>
        </div>
        <button
          onClick={() => setIsAddSourceOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income Source</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expected Inflow</span>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {formatMMK(totalExpected, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Combined target from active sources</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Income Received</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            {formatMMK(totalReceived, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Gross cash received before deductions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Loan Deductions</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">
            {formatMMK(totalDeductions, currency)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-deducted loan repayments</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Net Take-Home Salary</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            {formatMMK(totalNetTakeHome, currency)}
          </div>
          <p className="text-[11px] text-slate-300 mt-1">Disposable cash after direct loan payments</p>
        </div>
      </div>

      {/* Income Sources Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Active Income Streams ({incomeSources.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomeSources.map((source) => {
            const isReceived = !!source.currentIncome;
            const rec = source.currentIncome;
            const recGross = rec?.amount || 0;
            const recDeduction = rec?.deductionAmount || 0;
            const recNet = recGross - recDeduction;

            return (
              <div
                key={source.id}
                className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg">
                        💰
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{source.name}</h4>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {source.type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                        isReceived
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isReceived ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Recorded</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-slate-400">Expected Monthly Target</p>
                      <p className="text-sm font-bold text-slate-200">
                        {formatMMK(source.amount, currency)}
                      </p>
                    </div>

                    {isReceived && rec && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Gross Income Received:</span>
                          <span className="font-bold text-white">{formatMMK(recGross, currency)}</span>
                        </div>

                        {recDeduction > 0 && (
                          <div className="flex justify-between items-center text-xs text-rose-400">
                            <span className="flex items-center gap-1">
                              <MinusCircle className="w-3 h-3" />
                              <span>Direct Loan Deduction ({rec.deductionNote || 'Loan Payment'}):</span>
                            </span>
                            <span className="font-bold">-{formatMMK(recDeduction, currency)}</span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-xs font-extrabold">
                          <span className="text-emerald-400">Net Take-Home Salary:</span>
                          <span className="text-emerald-400 text-sm">{formatMMK(recNet, currency)}</span>
                        </div>

                         <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40 mt-1">
                          <div className="flex flex-col gap-0.5">
                            <span>Received: {formatDateString(rec.receivedDate)}</span>
                            {rec.targetMonth && (
                              <span className="text-amber-400 font-semibold">
                                Target Budget: {monthNames[rec.targetMonth - 1]} {rec.targetYear || 2026}
                              </span>
                            )}
                          </div>
                          {onDeleteRecord && (
                            <button
                              onClick={() => onDeleteRecord(rec.id)}
                              className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 text-[10px] font-semibold transition-colors flex items-center gap-1 border border-rose-800/40"
                              title="Delete this recorded income record and set back to pending"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear Record</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {source.notes && (
                    <p className="text-xs text-slate-400 mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                      {source.notes}
                    </p>
                  )}
                </div>

                {deletingSourceId === source.id ? (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="font-semibold text-rose-300">Delete this income stream?</p>
                    <p className="text-[10px] text-rose-400">This will delete the stream and mark all its historical records as deleted.</p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setDeletingSourceId(null)}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          setDeletingSourceId(null);
                          await onDeleteSource(source.id);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-700 text-white hover:bg-rose-600 text-[10px] font-semibold transition-colors shadow-lg"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleOpenRecord(source)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        isReceived
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isReceived ? 'Update Record / Deductions' : 'Record Received'}</span>
                    </button>

                    <button
                      onClick={() => setDeletingSourceId(source.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                      title="Delete Source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Confirmation Dialog */}
      {recordingSource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Record Received Income</h3>
                <p className="text-xs text-slate-400">{recordingSource.name}</p>
              </div>
              <button
                onClick={() => setRecordingSource(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gross Amount Received ({currency}) *
                </label>
                <input
                  type="number"
                  value={customRecordAmount}
                  onChange={(e) => setCustomRecordAmount(e.target.value)}
                  placeholder="e.g. 4060000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Date Received
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Target Budget Month Selector for Early Payouts */}
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Target Budget Month (Early Payout)</span>
                </span>
                <span className="text-[10px] text-slate-400">e.g. Received July 22 for August budget</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                   {Array.from({ length: 3 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Linked Direct Loan Payment Deduction Section */}
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDeduction}
                  onChange={(e) => setHasDeduction(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Auto-Deduct Direct Loan Payment (e.g. Home Loan)</span>
                </span>
              </label>

              {hasDeduction && (
                <div className="space-y-3 pt-2 border-t border-slate-700/60">
                  {loans.length > 0 ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Select Loan to Pay
                      </label>
                      <select
                        value={selectedLoanId}
                        onChange={(e) => {
                          setSelectedLoanId(e.target.value);
                          const loan = loans.find((l) => l.id === e.target.value);
                          if (loan) {
                            setDeductionAmount(loan.monthlyPayment.toString());
                            setDeductionNote(`${loan.name} Payment`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Custom / Unlinked Deduction --</option>
                        {loans
                          .filter((l) => l.status === 'active')
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name} (Monthly: {formatCompactMMK(l.monthlyPayment, currency)})
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-400">
                      No active loans found. You can still specify a custom deduction amount below.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Deduction Amount ({currency})
                      </label>
                      <input
                        type="number"
                        value={deductionAmount}
                        onChange={(e) => setDeductionAmount(e.target.value)}
                        placeholder="e.g. 1510000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Deduction Note
                      </label>
                      <input
                        type="text"
                        value={deductionNote}
                        onChange={(e) => setDeductionNote(e.target.value)}
                        placeholder="e.g. Home Loan installment"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Net Calculation Display Box */}
            <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>Gross Income:</span>
                <span className="font-semibold text-white">{formatMMK(grossCalculated, currency)}</span>
              </div>
              {hasDeduction && (
                <div className="flex justify-between items-center text-xs text-rose-400">
                  <span>Less Loan Deduction:</span>
                  <span className="font-semibold">-{formatMMK(deductionCalculated, currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-extrabold text-emerald-400">
                <span>Net Disposable Take-Home Salary:</span>
                <span>{formatMMK(netCalculated, currency)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes / Memo (Optional)
              </label>
              <input
                type="text"
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                placeholder="e.g. Bank transfer reference #1234"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

             <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {recordingSource.currentIncome && onDeleteRecord ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRecord(recordingSource.currentIncome!.id);
                    setRecordingSource(null);
                  }}
                  disabled={isRecordingIncome}
                  className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-800/40 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRecordingSource(null)}
                  disabled={isRecordingIncome}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRecord}
                  disabled={isRecordingIncome}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isRecordingIncome && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{recordingSource.currentIncome ? 'Update Record' : 'Confirm & Record'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Income Source Modal */}
      {isAddSourceOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Add Income Stream</h3>
              <button
                onClick={() => setIsAddSourceOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSource} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Salary, Mobile App Client"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expected Amount ({currency}) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={sourceAmount}
                  onChange={(e) => setSourceAmount(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="salary">Salary</option>
                  <option value="freelance">Freelance</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Payment details, bank info..."
                  value={sourceNotes}
                  onChange={(e) => setSourceNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSourceOpen(false)}
                  disabled={isCreatingSource}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSource}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingSource && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Income Source</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
