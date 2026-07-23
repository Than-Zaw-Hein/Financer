import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  Wallet,
  Building2
} from 'lucide-react';
import { getMonthName, formatCompactMMK } from '../lib/formatters';

interface HeaderProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
  onOpenAddExpense: () => void;
  availableCash: number;
  currency: string;
  isSyncing?: boolean;
  onQuickSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  currentYear,
  onMonthChange,
  onOpenAddExpense,
  availableCash,
  currency,
  isSyncing = false,
  onQuickSync,
}) => {
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 text-slate-100 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Cash Balance */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold text-lg">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight text-white">My Finance</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
              {currency}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            Cash Balance: <span className="font-semibold text-slate-200">{formatCompactMMK(availableCash, currency)}</span>
          </p>
        </div>
      </div>

      {/* Month & Year Navigator */}
      <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleCurrentMonth}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {getMonthName(currentMonth)} {currentYear}
          </span>
        </button>

        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {onQuickSync && (
          <button
            onClick={onQuickSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/60 transition-all disabled:opacity-50"
            title="Sync with Mobile or Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        )}

        <button
          onClick={onOpenAddExpense}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>
    </header>
  );
};
