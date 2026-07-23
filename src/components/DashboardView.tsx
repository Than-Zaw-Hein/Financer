import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ShieldCheck,
  Landmark,
  ArrowUpRight,
  Receipt,
  Plus,
  AlertCircle,
  AlertTriangle,
  BellRing
} from 'lucide-react';
import { DashboardSummary, Transaction, Category } from '../types';
import { formatMMK, formatCompactMMK, formatDateString } from '../lib/formatters';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  recentExpenses: Transaction[];
  categories: Category[];
  currency: string;
  onOpenAddExpense: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  recentExpenses,
  categories,
  currency,
  onOpenAddExpense,
  onNavigateToTab,
}) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
        Loading financial dashboard...
      </div>
    );
  }

  const {
    totalIncome,
    totalExpenses,
    surplus,
    availableCash,
    startingBalance,
    receivedIncome,
    pendingIncome,
    totalLoanBalance,
    totalLoanPayment,
    totalLentBalance = 0,
    totalLentReceivable = 0,
    overdueCount = 0,
    overdueLoansCount = 0,
    overdueLoansAmount = 0,
    overdueLentCount = 0,
    overdueLentAmount = 0,
    overbudgetCategoriesCount = 0,
    financialHealth,
    totalDeductions = 0,
    borrowedPayments = 0,
    lentCollected = 0,
    netTakeHome = receivedIncome,
  } = summary;

  // Plan budget categories calculation
  const planCategories = categories.filter((c) => c.isPlanBudget && c.budgetAmount);

  return (
    <div className="space-y-6 pb-12">
      {/* Overdue Alert Banner */}
      {overdueCount > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-slate-900 border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl shadow-rose-900/30 relative overflow-hidden animate-pulse-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                    Overdue Alert
                  </span>
                  <h3 className="font-bold text-sm text-white">
                    {overdueCount} Pending Financial Action{overdueCount > 1 ? 's' : ''} Require Attention
                  </h3>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-rose-200">
                  {overdueLoansCount > 0 && (
                    <span className="flex items-center gap-1 font-semibold">
                      🔴 {overdueLoansCount} Borrowed Loan Payment{overdueLoansCount > 1 ? 's' : ''} Overdue ({formatMMK(overdueLoansAmount, currency)})
                    </span>
                  )}

                  {overdueLentCount > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-amber-300">
                      🟢 {overdueLentCount} Lent Money Collection{overdueLentCount > 1 ? 's' : ''} Pending ({formatMMK(overdueLentAmount, currency)})
                    </span>
                  )}

                  {overbudgetCategoriesCount > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-rose-300">
                      ⚠️ {overbudgetCategoriesCount} Plan Budget Category{overbudgetCategoriesCount > 1 ? 'ies' : ''} Over Budget
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                onClick={() => onNavigateToTab('loans')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <span>Resolve Overdue Loans</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Welcome Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Overview</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracking cash flow, monthly plan budgets, and loan amortization in {currency}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            View All Expenses
          </button>
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Cash */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Cash</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              {formatMMK(availableCash, currency)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Starting Base:</span>
            <span className="font-semibold text-slate-300">{formatCompactMMK(startingBalance, currency)}</span>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              {formatMMK(totalIncome, currency)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Received Gross:</span>
              <span className="font-semibold text-slate-200">{formatCompactMMK(receivedIncome, currency)}</span>
            </div>
            {totalDeductions > 0 && (
              <>
                <div className="flex items-center justify-between text-rose-400/90">
                  <span>Loan Deductions:</span>
                  <span className="font-semibold">-{formatCompactMMK(totalDeductions, currency)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 mt-0.5 font-bold text-emerald-400">
                  <span>Net Take-home:</span>
                  <span>{formatCompactMMK(netTakeHome, currency)}</span>
                </div>
              </>
            )}
            {pendingIncome > 0 && (
              <div className="flex items-center justify-between text-amber-400/90">
                <span>Pending expected:</span>
                <span>{formatCompactMMK(pendingIncome, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-400 tracking-tight">
              {formatMMK(totalExpenses, currency)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Spend Ratio:</span>
            <span className="font-semibold text-slate-300">
              {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Net Monthly Surplus */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Monthly Surplus</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                surplus >= 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-extrabold tracking-tight ${
                surplus >= 0 ? 'text-indigo-400' : 'text-rose-400'
              }`}
            >
              {formatMMK(surplus, currency)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex flex-col gap-1">
            {borrowedPayments > 0 && (
              <div className="flex items-center justify-between text-rose-400/80">
                <span>Total Loan Payments:</span>
                <span>-{formatCompactMMK(borrowedPayments, currency)}</span>
              </div>
            )}
            {lentCollected > 0 && (
              <div className="flex items-center justify-between text-emerald-400/80">
                <span>Lent Collections:</span>
                <span>+{formatCompactMMK(lentCollected, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 mt-0.5">
              <span>Status:</span>
              <span className={`font-semibold ${surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {surplus >= 0 ? 'Positive Balance' : 'Deficit Warning'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health & Loans Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health Indicator */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Financial Health Score</h3>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                financialHealth.status === 'Healthy'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : financialHealth.status === 'Moderate'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {financialHealth.status} ({financialHealth.score}/100)
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-800">
            {financialHealth.message}
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Savings Rate</p>
              <p className="text-base font-bold text-emerald-400 mt-1">{financialHealth.savingsRate}%</p>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Debt-to-Income</p>
              <p className="text-base font-bold text-amber-400 mt-1">{financialHealth.debtToIncomeRatio}%</p>
            </div>
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400">Emergency Buffer</p>
              <p className="text-base font-bold text-blue-400 mt-1">{financialHealth.emergencyMonths} mos</p>
            </div>
          </div>
        </div>

        {/* Loan Amortization & Lending Summary Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Loans & Lending</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('loans')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                Manage <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/80">
                <p className="text-[11px] text-rose-300 font-semibold uppercase tracking-wider">
                  Borrowed (I Owe)
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-base font-bold text-white">
                    {formatMMK(totalLoanBalance, currency)}
                  </p>
                  <span className="text-[11px] text-amber-400 font-semibold">
                    {formatCompactMMK(totalLoanPayment, currency)}/mo
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/80">
                <p className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">
                  Lent (Owed to Me)
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-base font-bold text-emerald-400">
                    {formatMMK(totalLentBalance, currency)}
                  </p>
                  <span className="text-[11px] text-emerald-300 font-semibold">
                    {formatCompactMMK(totalLentReceivable, currency)}/mo
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('loans')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            Loans & Money Owed Details
          </button>
        </div>
      </div>

      {/* Plan Budget Progress Quick View */}
      {planCategories.length > 0 && (() => {
        const calculatedTotalPlanBudget = summary.totalPlanBudget ?? categories
          .filter((c) => c.isPlanBudget)
          .reduce((sum, c) => sum + (c.budgetAmount || 0), 0);

        const calculatedTotalPlanSpent = summary.totalPlanSpent ?? recentExpenses
          .filter((tx) => tx.category?.isPlanBudget)
          .reduce((sum, tx) => sum + tx.amount, 0);

        const planBudgetRemaining = calculatedTotalPlanBudget - calculatedTotalPlanSpent;
        const planUsagePct = calculatedTotalPlanBudget > 0
          ? Math.round((calculatedTotalPlanSpent / calculatedTotalPlanBudget) * 100)
          : 0;

        return (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Plan Budget Preview ({planCategories.length} Categories)</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('expenses')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Open Plan Expenses →
              </button>
            </div>

            {/* Total Plan Budget Summary Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-800 to-slate-900 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Total Monthly Plan Budget</p>
                <p className="text-xl font-extrabold text-white">{formatMMK(calculatedTotalPlanBudget, currency)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Actual Plan Spent</p>
                <p className="text-xl font-extrabold text-rose-400">{formatMMK(calculatedTotalPlanSpent, currency)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remaining Plan Budget</p>
                <p className={`text-xl font-extrabold ${planBudgetRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatMMK(planBudgetRemaining, currency)}
                </p>
              </div>

              <div className="w-full sm:w-48 space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-300">Plan Utilization</span>
                  <span className={planUsagePct > 100 ? 'text-rose-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                    {planUsagePct}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      planUsagePct > 100 ? 'bg-rose-500' : planUsagePct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, planUsagePct)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planCategories.slice(0, 6).map((cat) => {
                const spent = recentExpenses
                  .filter((tx) => tx.categoryId === cat.id)
                  .reduce((acc, tx) => acc + tx.amount, 0);

                const budget = cat.budgetAmount || 0;
                const remaining = budget - spent;
                const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                return (
                  <div key={cat.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                      <span className={`font-semibold ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {remaining >= 0 ? `${formatCompactMMK(remaining, currency)} left` : 'Over budget'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          pct > 100
                            ? 'bg-rose-500'
                            : pct > 80
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Spent: {formatCompactMMK(spent, currency)}</span>
                      <span>Limit: {formatCompactMMK(budget, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Recent Expense Transactions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-400" />
            <span>Recent Expense Transactions</span>
          </h3>
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            View All →
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No expenses recorded yet for this month.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 overflow-x-auto">
            {recentExpenses.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${tx.category?.color || '#334155'}20` }}
                  >
                    {tx.category?.icon || '📌'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{tx.name || 'Expense'}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>{tx.category?.name || 'Uncategorized'}</span>
                      <span>•</span>
                      <span>{formatDateString(tx.date)}</span>
                      {tx.method && (
                        <>
                          <span>•</span>
                          <span className="uppercase text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                            {tx.method}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-rose-400 text-sm">
                    -{formatMMK(tx.amount, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
