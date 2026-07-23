import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMMK, formatCompactMMK, formatDateString } from '../lib/formatters';

interface ExpensesViewProps {
  expenses: Transaction[];
  categories: Category[];
  currency: string;
  onOpenAddExpense: (presetCategory?: Category, presetAmount?: number) => void;
  onEditExpense: (expense: Transaction) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  categories,
  currency,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'extra' | 'all'>('plan');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Categories with Plan Budget
  const planCategories = categories.filter((c) => c.isPlanBudget && c.budgetAmount);
  // Extra / Unbudgeted Categories
  const extraCategories = categories.filter((c) => !c.isPlanBudget);

  // Filtered expenses list
  const filteredExpenses = expenses.filter((tx) => {
    const matchesSearch =
      (tx.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === 'ALL' || (tx.method || 'cash').toLowerCase() === methodFilter.toLowerCase();

    if (!matchesSearch || !matchesMethod) return false;

    if (activeTab === 'plan') {
      return tx.category?.isPlanBudget;
    } else if (activeTab === 'extra') {
      return !tx.category?.isPlanBudget;
    }
    return true;
  });

  const totalSpent = filteredExpenses.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Expenses & Budget Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorized spending in {currency} with Plan Budget limits and auto-fill tracking.
          </p>
        </div>
        <button
          onClick={() => onOpenAddExpense()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Tabs Selector: Plan Budget vs Extra vs All */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'plan'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Plan Budget ({planCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('extra')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'extra'
              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Extra / Unbudgeted ({extraCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <span>All Transactions ({expenses.length})</span>
        </button>
      </div>

      {/* Plan Budget Category Cards (if activeTab is 'plan') */}
      {activeTab === 'plan' && (() => {
        const totalPlanBudget = planCategories.reduce((sum, c) => sum + (c.budgetAmount || 0), 0);
        const totalPlanSpent = expenses
          .filter((tx) => tx.category?.isPlanBudget)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const planRemaining = totalPlanBudget - totalPlanSpent;
        const planUsagePct = totalPlanBudget > 0 ? Math.round((totalPlanSpent / totalPlanBudget) * 100) : 0;

        return (
          <div className="space-y-4">
            {/* Total Plan Budget Summary Banner */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Current Month Plan Budget Summary</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sum of all {planCategories.length} allocated monthly category plan budgets
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Total Plan Budget</span>
                    <span className="text-lg font-extrabold text-amber-400">{formatMMK(totalPlanBudget, currency)}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Actual Plan Spent</span>
                    <span className="text-lg font-extrabold text-rose-400">{formatMMK(totalPlanSpent, currency)}</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Remaining Balance</span>
                    <span className={`text-lg font-extrabold ${planRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatMMK(planRemaining, currency)}
                    </span>
                  </div>

                  <div className="w-full sm:w-36 space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">Usage</span>
                      <span className={planUsagePct > 100 ? 'text-rose-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                        {planUsagePct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          planUsagePct > 100 ? 'bg-rose-500' : planUsagePct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, planUsagePct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planCategories.map((cat) => {
                const categorySpent = expenses
                  .filter((tx) => tx.categoryId === cat.id)
                  .reduce((sum, tx) => sum + tx.amount, 0);

                const budget = cat.budgetAmount || 0;
                const remaining = budget - categorySpent;
                const pct = budget > 0 ? Math.min(100, Math.round((categorySpent / budget) * 100)) : 0;

                return (
                  <div
                    key={cat.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                            style={{ backgroundColor: `${cat.color}25` }}
                          >
                            {cat.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{cat.name}</h4>
                            <span className="text-[11px] text-slate-400">
                              Budget: {formatCompactMMK(budget, currency)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            remaining < 0
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {remaining >= 0 ? 'Within Plan' : 'Exceeded'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 space-y-1">
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
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
                        <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                          <span>Spent: {formatCompactMMK(categorySpent, currency)}</span>
                          <span className={remaining < 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                            Remaining: {formatCompactMMK(remaining, currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-fill Quick Record Action */}
                    <button
                      onClick={() => onOpenAddExpense(cat, budget)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-400 border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Auto-fill & Add Expense</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search expense description, notes, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Method Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Payment:</span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Methods</option>
            <option value="cash">Cash</option>
            <option value="kpay">KBZ Pay (KPay)</option>
            <option value="wave">Wave Pay</option>
            <option value="aya">AYA Pay / Bank</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-semibold bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
          Filtered Spend: <span className="text-rose-400">{formatMMK(totalSpent, currency)}</span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-400" />
          <span>Expense Log ({filteredExpenses.length})</span>
        </h3>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No expenses found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-200">{tx.name || 'Expense'}</div>
                      {tx.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.notes}</div>}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        <span>{tx.category?.icon || '📌'}</span>
                        <span>{tx.category?.name || 'Uncategorized'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400">{formatDateString(tx.date)}</td>

                    <td className="py-3.5 px-3">
                      <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold border border-slate-700">
                        {tx.method || 'cash'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-bold text-rose-400 text-sm">
                      -{formatMMK(tx.amount, currency)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditExpense(tx)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Soft Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
