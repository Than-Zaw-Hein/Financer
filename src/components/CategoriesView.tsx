import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Shield,
  Edit2,
  Trash2,
  X,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Category } from '../types';
import { formatMMK, formatCompactMMK } from '../lib/formatters';

interface CategoriesViewProps {
  categories: Category[];
  currency: string;
  onCreateCategory: (data: { name: string; icon: string; color: string; isPlanBudget: boolean; budgetAmount?: number }) => Promise<void> | void;
  onUpdateCategory: (id: string, data: { name: string; icon: string; color: string; isPlanBudget: boolean; budgetAmount?: number }) => Promise<void> | void;
  onDeleteCategory: (id: string) => void;
}

const COLOR_PALETTE = [
  '#2196F3', '#4CAF50', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#009688',
  '#8BC34A', '#37474F', '#FF5722', '#9C27B0'
];

const EMOJI_OPTIONS = ['🍚', '⚡', '📱', '🍲', '🚕', '💊', '✨', '💰', '🏠', '🛒', '🎓', '✈️', '🎮', '🐾'];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  currency,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📌');
  const [color, setColor] = useState('#2196F3');
  const [isPlanBudget, setIsPlanBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setIcon('📌');
    setColor('#2196F3');
    setIsPlanBudget(false);
    setBudgetAmount('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setIsPlanBudget(category.isPlanBudget);
    setBudgetAmount(category.budgetAmount ? category.budgetAmount.toString() : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const parsedBudget = isPlanBudget && budgetAmount ? parseFloat(budgetAmount) : undefined;

    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: name.trim(),
          icon,
          color,
          isPlanBudget,
          budgetAmount: parsedBudget,
        });
      } else {
        await onCreateCategory({
          name: name.trim(),
          icon,
          color,
          isPlanBudget,
          budgetAmount: parsedBudget,
        });
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Category Manager</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure expense categories, color tags, icons, and Plan Budget limits.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isProtected = cat.name === 'Extra' || cat.name === 'Income' || cat.id === 'cat-extra' || cat.id === 'cat-income';

          return (
            <div
              key={cat.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner"
                      style={{ backgroundColor: `${cat.color}25` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {isProtected && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            Default
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {cat.isPlanBudget ? 'Plan Budget Category' : 'Extra / Unbudgeted Category'}
                      </p>
                    </div>
                  </div>
                </div>

                {cat.isPlanBudget && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Monthly Budget Limit:</span>
                    <span className="font-bold text-amber-400">
                      {formatMMK(cat.budgetAmount, currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {!isProtected ? (
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 italic px-2">Protected</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Add / Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Fuel, Education"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Icon</label>
                <div className="flex flex-wrap gap-2 bg-slate-800/60 p-2 rounded-xl border border-slate-800">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => setIcon(e)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                        icon === e ? 'bg-blue-600 text-white scale-110 shadow-md' : 'hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Tag Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Color Theme</label>
                <div className="flex flex-wrap gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                  {COLOR_PALETTE.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setColor(hex)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === hex ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Plan Budget Toggle */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPlanBudget}
                    onChange={(e) => setIsPlanBudget(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Enable Plan Budget for this Category
                  </span>
                </label>
              </div>

              {isPlanBudget && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Monthly Budget Target ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 200000"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    required={isPlanBudget}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
