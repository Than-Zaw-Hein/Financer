import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Loader2 } from 'lucide-react';
import { Category, Transaction } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: string;
  editingExpense?: Transaction | null;
  presetCategory?: Category | null;
  presetAmount?: number | null;
  onSave: (expenseData: {
    id?: string;
    amount: number;
    categoryId?: string;
    name: string;
    date: string;
    method: string;
    notes: string;
  }) => Promise<void> | void;
  currentMonth?: number;
  currentYear?: number;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  currency,
  editingExpense,
  presetCategory,
  presetAmount,
  onSave,
  currentMonth,
  currentYear,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [method, setMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setName(editingExpense.name || '');
      setCategoryId(editingExpense.categoryId || '');
      setMethod(editingExpense.method || 'cash');
      setNotes(editingExpense.notes || '');
      setDate(new Date(editingExpense.date).toISOString().split('T')[0]);
    } else {
      setAmount(presetAmount ? presetAmount.toString() : '');
      setName(presetCategory ? presetCategory.name : '');
      setCategoryId(presetCategory ? presetCategory.id : (categories[0]?.id || ''));
      setMethod('cash');
      setNotes('');
    
      // Intelligently default date to the viewed month/year
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayYear = today.getFullYear();

      if (currentMonth && currentYear && (currentMonth !== todayMonth || currentYear !== todayYear)) {
        // If viewing a different month, default to the 1st day of that month
        const mm = String(currentMonth).padStart(2, '0');
        setDate(`${currentYear}-${mm}-01`);
      } else {
        // Otherwise, default to today's date
        setDate(today.toISOString().split('T')[0]);
      }
    }
  }, [editingExpense, presetCategory, presetAmount, categories, isOpen, currentMonth, currentYear]);

  if (!isOpen) return null;

  const handleAddQuickAmount = (delta: number) => {
    const currentNum = parseFloat(amount) || 0;
    setAmount((currentNum + delta).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || isSaving) return;

    setIsSaving(true);
    try {
      await onSave({
        id: editingExpense?.id,
        amount: parsedAmount,
        categoryId,
        name: name.trim() || 'Expense',
        date: new Date(date).toISOString(),
        method,
        notes,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-white">
            {editingExpense ? 'Edit Expense Record' : 'Record Expense'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="e.g. 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* MMK Shortcut Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: '+10k', val: 10000 },
                { label: '+50k', val: 50000 },
                { label: '+100k', val: 100000 },
                { label: '+500k', val: 500000 },
                { label: '+1M', val: 1000000 },
              ].map((btn) => (
                <button
                  type="button"
                  key={btn.label}
                  onClick={() => handleAddQuickAmount(btn.val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-blue-400 border border-slate-700 transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Item Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Rice Bag, YESC Electricity, Lunch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category & Payment Method Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="kpay">KBZ Pay (KPay)</option>
                <option value="wave">Wave Pay</option>
                <option value="aya">AYA Pay</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingExpense ? 'Save Changes' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
