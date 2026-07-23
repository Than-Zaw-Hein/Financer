'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { formatMMK, formatDate, monthNames } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Chip from '@/components/ui/Chip'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '', date: now.toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [tab, setTab] = useState<'plan' | 'extra'>('plan')

  const params = new URLSearchParams({ month: String(month), year: String(year) })
  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/expenses?${params}`, fetcher)
  const { data: apiCategories } = useSWR('/api/categories', fetcher)

  const budgetByCatId = new Map<string, number>()
  if (apiCategories && Array.isArray(apiCategories)) {
    apiCategories.forEach((c: { id: string; isPlanBudget?: boolean; budgetAmount?: number | null }) => {
      if (c.isPlanBudget && c.budgetAmount) budgetByCatId.set(c.id, c.budgetAmount)
    })
  }

  const catById = new Map<string, { name: string; icon: string; color: string }>()
  const catIdByName = new Map<string, string>()
  if (apiCategories && Array.isArray(apiCategories)) {
    apiCategories.forEach((c: { id: string; name: string; icon: string; color: string }) => {
      catById.set(c.id, { name: c.name, icon: c.icon, color: c.color })
      catIdByName.set(c.name, c.id)
    })
  }

  const catNames = apiCategories && Array.isArray(apiCategories) && apiCategories.length > 0
    ? apiCategories.filter((c: { name: string }) => c.name !== 'Income').map((c: { name: string }) => c.name)
    : ['Family', 'Groceries', 'Housing', 'Baby', 'Personal', 'Utilities', 'Other', 'Food', 'Bills']
  const categories = [...new Set([...catNames, ...(data?.items || []).map((i: { category?: { name: string } }) => i.category?.name || 'Other')])].sort()

  const planCategories = categories.filter(catName => {
    const catId = catIdByName.get(catName)
    return catId && budgetByCatId.has(catId)
  })
  const extraCategories = categories.filter(catName => {
    const catId = catIdByName.get(catName)
    return !catId || !budgetByCatId.has(catId)
  })
  const activeCategories = tab === 'plan' ? planCategories : extraCategories

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }

  function openAdd() {
    setForm({ categoryId: '', amount: '', date: now.toISOString().split('T')[0], notes: '' })
    setFormError('')
    setShowForm(true)
  }

  function validate() {
    if (!form.categoryId) { setFormError('Category is required'); return false }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError('Valid amount is required'); return false }
    return true
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    const cat = catById.get(form.categoryId)
    const body = {
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      name: cat?.name || null,
      date: form.date || undefined,
      notes: form.notes || null,
      month,
      year,
    }
    await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await refetch()
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await refetch()
    setDeleteId(null)
  }

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-32 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={4} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load expenses" onRetry={() => refetch()} /></div>

  const items: { id: string; amount: number; categoryId: string | null; name: string | null; date: string; notes: string | null; category: { id: string; name: string; icon: string; color: string } | null }[] = data?.items || []
  const totalAmount = items.reduce((s: number, i: { amount: number }) => s + i.amount, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Expenses</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add</button>
      </div>

      <div className="flex items-center justify-center bg-surface rounded-[12px] shadow-elevation-1 p-3 gap-4">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Previous month">&larr;</button>
        <h2 className="text-title-large font-normal text-on-surface">{monthNames[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Next month">&rarr;</button>
      </div>

      {data && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-4 text-center">
          <p className="text-label-medium text-on-surface-variant">Total</p>
          <p className="text-title-medium font-normal text-on-surface">{formatMMK(totalAmount)}</p>
        </div>
      )}

      {activeCategories.length > 0 && (
        <div className="flex gap-1 bg-surface-container-high rounded-[12px] p-1">
          <button onClick={() => setTab('plan')}
            className={`flex-1 px-4 py-2.5 rounded-[8px] text-label-large font-medium transition-all ${
              tab === 'plan' ? 'bg-surface text-primary shadow-elevation-1' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            Plan Budget ({planCategories.length})
          </button>
          <button onClick={() => setTab('extra')}
            className={`flex-1 px-4 py-2.5 rounded-[8px] text-label-large font-medium transition-all ${
              tab === 'extra' ? 'bg-surface text-primary shadow-elevation-1' : 'text-on-surface-variant hover:text-on-surface'
            }`}>
            Extra ({extraCategories.length})
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No expenses" description="Add your first expense" action="Add Expense" onAction={openAdd} />
      ) : (
        (activeCategories.length === 0 && items.length > 0 ? categories : activeCategories).map(catName => {
          const catItems = items.filter(i => (i.category?.name || 'Other') === catName)
          const hasBudget = catIdByName.has(catName) && budgetByCatId.has(catIdByName.get(catName)!)
          if (catItems.length === 0 && !(tab === 'plan' && hasBudget)) return null
          const catTotal = catItems.reduce((s: number, i: { amount: number }) => s + i.amount, 0)
          const catInfo = apiCategories?.find((c: { name: string }) => c.name === catName)
          return (
            <div key={catName} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-label-large text-on-surface-variant font-medium uppercase tracking-wider">{catInfo?.icon ? `${catInfo.icon} ${catName}` : catName}</h3>
                <div className="text-right">
                  <span className="text-label-medium text-on-surface-variant">{formatMMK(catTotal)}</span>
                  {(() => {
                    const catId = catIdByName.get(catName)
                    const budget = catId ? budgetByCatId.get(catId) : undefined
                    if (budget === undefined) return null
                    const spent = catTotal
                    const remaining = budget - spent
                    return (
                      <p className={`text-label-small ${remaining >= 0 ? 'text-tertiary' : 'text-error'}`}>
                        Budget: {formatMMK(budget)} · Remaining: {formatMMK(remaining)}
                      </p>
                    )
                  })()}
                </div>
              </div>
              <div className="space-y-1.5">
                {catItems.length === 0 ? (
                  <p className="text-body-small text-on-surface-variant px-1 py-1">No transactions yet</p>
                ) : catItems.map((item: { id: string; amount: number; name: string | null; date: string; notes: string | null }) => (
                  <div key={item.id} className="flex items-center justify-between bg-surface rounded-[12px] shadow-elevation-0 hover:shadow-elevation-1 px-4 py-3 transition-shadow min-h-[48px]">
                    <div className="min-w-0 flex-1">
                      <span className="text-body-large text-on-surface truncate block">{item.name || catName}</span>
                      <span className="text-label-small text-on-surface-variant">{formatDate(item.date)}{item.notes ? ` · ${item.notes}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-label-large font-medium text-on-surface">{formatMMK(item.amount)}</span>
                      <button onClick={() => setDeleteId(item.id)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-error hover:bg-error/8 rounded-[8px] transition-all min-h-[44px]">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Add Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError('') }} title="Add Expense">
        {formError && <p className="text-label-medium text-error bg-error-container p-2 rounded-[8px]">{formError}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-label-medium text-on-surface-variant">Category *</label>
            <select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" value={form.categoryId} onChange={e => {
              const catId = e.target.value
              const budget = budgetByCatId.get(catId)
              setForm({ ...form, categoryId: catId, amount: budget ? String(budget) : form.amount })
            }}>
              <option value="">Select category</option>
              {apiCategories && Array.isArray(apiCategories) && apiCategories.filter((c: { name: string }) => c.name !== 'Income').map((c: { id: string; name: string; icon: string }) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}{budgetByCatId.has(c.id) ? ` (Budget: ${formatMMK(budgetByCatId.get(c.id)!)})` : ''}</option>
              ))}
            </select>
            {form.categoryId && budgetByCatId.has(form.categoryId) && (() => {
              const budget = budgetByCatId.get(form.categoryId)!
              const spent = items.filter(i => i.categoryId === form.categoryId).reduce((s: number, i: { amount: number }) => s + i.amount, 0)
              const currentAmount = parseFloat(form.amount) || 0
              const remaining = budget - spent - currentAmount
              return (
                <div className={`mt-1.5 px-3 py-1.5 text-label-small rounded-[8px] ${remaining >= 0 ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
                  Budget: {formatMMK(budget)} · Spent: {formatMMK(spent)} · Remaining: {formatMMK(remaining)}
                </div>
              )
            })()}
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Amount *</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Date</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Note</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Optional note" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setFormError('') }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message="Delete this expense?" />
    </div>
  )
}
