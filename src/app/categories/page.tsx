'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const EMOJIS = [
  '🍚','🏠','🛒','💊','⛽','☕','🎓','✈️','🎁','📱','👗','🐾','🎮','📚','💡','🔧','🎵','🏋️','🌿','🎬',
  '💻','🚗','🍕','👶','💇','🐶','🎂','⚽','📷','🎨','💼','🏥','🚌','📞','🔑','🎒','👟','🍺','🎲','🏖️',
  '💰','✨','📌','🏦','💳','📊','📈','💸','🏷️','📝','🔔','⭐','❤️','🔥','💧','🎯','🏆','📅','⏰','🔒',
  '🌟','💪','🧠','👀','👋','🤝','📢','🎪','🎭','🍀','🌈','⚡','💎','🔮','🎈','🪴','🧹','🛏️','🚿','🍽️',
  '🧾',
]

const COLORS = [
  '#FFE0B2','#C8E6C9','#4CAF50','#FF5722',
  '#FF8A65','#009688','#2196F3','#673AB7',
  '#8BC34A','#03A9F4','#9C27B0','#37474F',
]

const emptyForm = { name: '', icon: '📌', color: '#2196F3', budget: '', hasBudget: false }

export default function CategoriesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/categories', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const categories: { id: string; name: string; icon: string; color: string; isPlanBudget?: boolean; budgetAmount?: number | null; _count?: { transactions: number } }[] = Array.isArray(data) ? data : []

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true); setFormError('') }
  function openEdit(cat: { id: string; name: string; icon: string; color: string; isPlanBudget?: boolean; budgetAmount?: number | null }) {
    setEditId(cat.id)
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, budget: cat.budgetAmount ? String(cat.budgetAmount) : '', hasBudget: !!cat.isPlanBudget })
    setShowForm(true)
    setFormError('')
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    // Check for duplicate name (case-insensitive) when creating new
    if (!editId && categories.some(c => c.name.toLowerCase() === form.name.toLowerCase())) {
      setFormError('A category with this name already exists')
      return
    }
    setSaving(true)
    let catId = editId
    const catPayload = {
      name: form.name,
      icon: form.icon,
      color: form.color,
      isPlanBudget: form.hasBudget,
      budgetAmount: form.hasBudget && form.budget ? parseFloat(form.budget) : null,
    }
    if (editId) {
      await fetch(`/api/categories/${editId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catPayload),
      })
    } else {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catPayload),
      })
      const created = await res.json()
      catId = created.id
    }
    await mutate()
    setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    await mutate()
    setDeleteId(null)
  }

  if (isLoading) return <div className="max-w-3xl mx-auto space-y-6 py-4"><div className="h-8 w-40 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={4} /></div>
  if (error) return <div className="max-w-3xl mx-auto py-4"><ErrorState message="Failed to load categories" onRetry={() => mutate()} /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Categories</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add Category</button>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories" description="Add your first category" action="Add Category" onAction={openAdd} />
      ) : (
        <div className="space-y-1.5">
          {categories.map((cat: { id: string; name: string; icon: string; color: string; isPlanBudget?: boolean; budgetAmount?: number | null; _count?: { transactions: number } }) => (
            <div key={cat.id} className="flex items-center justify-between bg-surface rounded-[12px] shadow-elevation-0 hover:shadow-elevation-1 px-4 py-3 transition-shadow min-h-[48px]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <span className="text-body-large text-on-surface truncate block">{cat.name}</span>
                  <span className="text-label-small text-on-surface-variant">{cat._count?.transactions || 0} transactions{cat.isPlanBudget && cat.budgetAmount ? ` · Budget: ${cat.budgetAmount.toLocaleString()} Ks` : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                <button onClick={() => openEdit(cat)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-primary hover:bg-primary/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]">Edit</button>
                {cat.name !== 'Extra' && cat.name !== 'Income' && (
                  <button onClick={() => setDeleteId(cat.id)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-error hover:bg-error/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]">Del</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Category' : 'Add Category'}>
        {formError && <p className="text-label-medium text-error bg-error-container p-2 rounded-[8px]">{formError}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-label-medium text-on-surface-variant">Name *</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Category name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="text-label-medium text-on-surface-variant mb-2 block">Icon</label>
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto bg-surface-container-low rounded-[12px] p-2">
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => setForm({ ...form, icon: emoji })}
                  className={`w-10 h-10 flex items-center justify-center rounded-[8px] text-lg transition-all ${
                    form.icon === emoji ? 'bg-primary-container ring-2 ring-primary' : 'hover:bg-surface-container-high'
                  }`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-label-medium text-on-surface-variant mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button key={color} onClick={() => setForm({ ...form, color })}
                  className={`w-10 h-10 rounded-full transition-all ${
                    form.color === color ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-body-large text-on-surface cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={form.hasBudget} onChange={e => setForm({ ...form, hasBudget: e.target.checked })} className="w-5 h-5 rounded-[4px] accent-primary" />
            Set monthly budget
          </label>
          {form.hasBudget && (
            <div>
              <label className="text-label-medium text-on-surface-variant">Budget Amount</label>
              <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message={`Delete "${categories.find((c: { id: string; name: string }) => c.id === deleteId)?.name}"?`} />
    </div>
  )
}
