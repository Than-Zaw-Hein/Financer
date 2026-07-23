import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { IncomeView } from './components/IncomeView';
import { CategoriesView } from './components/CategoriesView';
import { LoansView } from './components/LoansView';
import { CashFlowView } from './components/CashFlowView';
import { SettingsView } from './components/SettingsView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { Check, X, Info } from 'lucide-react';
import {
  DashboardSummary,
  Transaction,
  Category,
  IncomeSource,
  Income,
  Loan,
  CashFlowMonth,
  SyncResponse
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Data States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [incomeSources, setIncomeSources] = useState<(IncomeSource & { currentIncome?: Income | null })[]>([]);
  const [recordedIncomes, setRecordedIncomes] = useState<Income[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowMonth[]>([]);
  const [currency, setCurrency] = useState<string>('MMK');
  const [startingBalance, setStartingBalance] = useState<number>(0);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Custom Toast System state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modal States
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [presetCategory, setPresetCategory] = useState<Category | null>(null);
  const [presetAmount, setPresetAmount] = useState<number | null>(null);

  // Main Data Fetching Function (utilizes no-store and query string cache-busting to guarantee latest db values)
  const fetchAllData = useCallback(async () => {
    try {
      const t = Date.now();
      const fetchOpts = { cache: 'no-store' as const };
      
      const [dashRes, expRes, catRes, incRes, loanRes, cfRes, setRes] = await Promise.all([
        fetch(`/api/dashboard?month=${currentMonth}&year=${currentYear}&_t=${t}`, fetchOpts),
        fetch(`/api/expenses?month=${currentMonth}&year=${currentYear}&type=EXPENSE&_t=${t}`, fetchOpts),
        fetch(`/api/categories?_t=${t}`, fetchOpts),
        fetch(`/api/income?month=${currentMonth}&year=${currentYear}&_t=${t}`, fetchOpts),
        fetch(`/api/loans?_t=${t}`, fetchOpts),
        fetch(`/api/cashflow?months=12&_t=${t}`, fetchOpts),
        fetch(`/api/settings?_t=${t}`, fetchOpts),
      ]);

      if (dashRes.ok) setSummary(await dashRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
      if (catRes.ok) setCategories(await catRes.json());

      if (incRes.ok) {
        const incData = await incRes.json();
        setIncomeSources(incData.sources || []);
        setRecordedIncomes(incData.recordedIncomes || []);
      }

      if (loanRes.ok) setLoans(await loanRes.json());
      if (cfRes.ok) setCashFlowData(await cfRes.json());

      if (setRes.ok) {
        const s = await setRes.json();
        if (s.currency) setCurrency(s.currency);
        if (s.starting_balance) setStartingBalance(parseFloat(s.starting_balance));
      }
    } catch (err) {
      console.error('Data loading error:', err);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handler for Month Navigation
  const handleMonthChange = (m: number, y: number) => {
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  // Quick Expense Modal Triggers
  const handleOpenAddExpense = (pCat?: Category, pAmt?: number) => {
    setEditingExpense(null);
    setPresetCategory(pCat || null);
    setPresetAmount(pAmt || null);
    setIsAddExpenseOpen(true);
  };

  const handleEditExpense = (tx: Transaction) => {
    setEditingExpense(tx);
    setPresetCategory(null);
    setPresetAmount(null);
    setIsAddExpenseOpen(true);
  };

  const handleSaveExpense = async (expenseData: any) => {
    if (expenseData.id) {
      // PUT
      await fetch(`/api/expenses/${expenseData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      showToast('Expense record updated successfully.');
    } else {
      // POST
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          month: currentMonth,
          year: currentYear,
        }),
      });
      showToast('Expense recorded successfully!');
    }
    await fetchAllData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      await fetchAllData();
      showToast('Expense record removed.', 'info');
    }
  };

  // Income Handlers
  const handleRecordIncome = async (
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
    }
  ) => {
    await fetch(`/api/income/${sourceId}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: payload.amount,
        month: currentMonth,
        year: currentYear,
        receivedDate: payload.receivedDate,
        targetMonth: payload.targetMonth,
        targetYear: payload.targetYear,
        deductionAmount: payload.deductionAmount,
        deductionNote: payload.deductionNote,
        linkedLoanId: payload.linkedLoanId,
        notes: payload.notes,
      }),
    });
    await fetchAllData();
    showToast('Income recorded successfully!');
  };

  const handleCreateIncomeSource = async (sourceData: any) => {
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sourceData),
    });
    await fetchAllData();
    showToast('New income stream source added.');
  };

  const handleDeleteIncomeSource = async (id: string) => {
    if (confirm('Delete this income stream?')) {
      await fetch(`/api/income/${id}`, { method: 'DELETE' });
      await fetchAllData();
      showToast('Income source deleted.', 'info');
    }
  };

  // Category Handlers
  const handleCreateCategory = async (catData: any) => {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData),
    });
    await fetchAllData();
    showToast('New category created successfully!');
  };

  const handleUpdateCategory = async (id: string, catData: any) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData),
    });
    await fetchAllData();
    showToast('Category updated.');
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Cannot delete category');
    } else {
      await fetchAllData();
      showToast('Category deleted.', 'info');
    }
  };

  // Loan Handlers
  const handleRecordLoanPayment = async (loanId: string, amount?: number) => {
    await fetch(`/api/loans/${loanId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        targetMonth: currentMonth,
        targetYear: currentYear,
      }),
    });
    await fetchAllData();
    showToast('Monthly amortization payment recorded.');
  };

  const handleUndoLoanPayment = async (loanId: string) => {
    await fetch(`/api/loans/${loanId}/pay/undo`, { method: 'DELETE' });
    await fetchAllData();
    showToast('Payment rolled back successfully.');
  };

  const handleCreateLoan = async (loanData: any) => {
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    });
    await fetchAllData();
    showToast('New loan record registered.');
  };

  const handleDeleteLoan = async (loanId: string) => {
    const res = await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Cannot delete loan');
    } else {
      await fetchAllData();
      showToast('Loan record permanently removed.');
    }
  };

  const handleEditLoan = async (loanId: string, loanData: any) => {
    const res = await fetch(`/api/loans/${loanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Cannot update loan');
    } else {
      await fetchAllData();
      showToast('Loan record updated.');
    }
  };

  // Settings Handlers
  const handleUpdateSettings = async (newCurrency: string, newStartingBalance: number) => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency: newCurrency,
        starting_balance: newStartingBalance,
      }),
    });
    await fetchAllData();
    showToast('Settings successfully updated!');
  };

  const handleResetSeedData = async () => {
    if (confirm('Reset entire database to initial MMK demo data?')) {
      await fetch('/api/seed/reset', { method: 'POST' });
      await fetchAllData();
      showToast('Database reset to MMK defaults.');
    }
  };

  // Mobile Sync Handler
  const handleTriggerSync = async (payload?: any): Promise<SyncResponse | null> => {
    setIsSyncing(true);
    try {
      const body = payload || {
        categories: [],
        expenses: [],
        income: [],
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const syncResult: SyncResponse = await res.json();
      await fetchAllData();
      showToast('Data refreshed & synced successfully!');
      return syncResult;
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Sync / refresh failed. Check server status.', 'error');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* App Header Bar */}
      <Header
        currentMonth={currentMonth}
        currentYear={currentYear}
        onMonthChange={handleMonthChange}
        onOpenAddExpense={() => handleOpenAddExpense()}
        availableCash={summary?.availableCash || 0}
        currency={currency}
        isSyncing={isSyncing}
        onQuickSync={() => handleTriggerSync()}
      />

      {/* Main App Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic View Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              recentExpenses={expenses}
              categories={categories}
              currency={currency}
              onOpenAddExpense={() => handleOpenAddExpense()}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              categories={categories}
              currency={currency}
              onOpenAddExpense={handleOpenAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'income' && (
            <IncomeView
              incomeSources={incomeSources}
              recordedIncomes={recordedIncomes}
              loans={loans}
              currency={currency}
              onRecordIncome={handleRecordIncome}
              onCreateSource={handleCreateIncomeSource}
              onDeleteSource={handleDeleteIncomeSource}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesView
              categories={categories}
              currency={currency}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'loans' && (
            <LoansView
              loans={loans}
              currency={currency}
              onRecordPayment={handleRecordLoanPayment}
              onUndoPayment={handleUndoLoanPayment}
              onCreateLoan={handleCreateLoan}
              onDeleteLoan={handleDeleteLoan}
              onEditLoan={handleEditLoan}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowView cashFlowData={cashFlowData} currency={currency} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currency={currency}
              startingBalance={startingBalance}
              onUpdateSettings={handleUpdateSettings}
              onResetSeedData={handleResetSeedData}
              onTriggerSync={handleTriggerSync}
            />
          )}
        </main>
      </div>

      {/* Record Expense Dialog */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        categories={categories}
        currency={currency}
        editingExpense={editingExpense}
        presetCategory={presetCategory}
        presetAmount={presetAmount}
        onSave={handleSaveExpense}
      />

      {/* Floating Toast Notification System */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs shadow-2xl animate-bounce-short transition-all">
          <div className={`p-1.5 rounded-xl ${
            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
            toast.type === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
            'bg-blue-500/20 text-blue-400 border border-blue-500/20'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> :
             toast.type === 'error' ? <X className="w-4 h-4" /> :
             <Info className="w-4 h-4" />}
          </div>
          <span className="font-semibold text-slate-100">{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 ml-1.5 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
