'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { formatMMK, formatDate, monthNames } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Chip from '@/components/ui/Chip'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const presetCategories = ['Family', 'Groceries', 'Housing', 'Baby', 'Personal', 'Utilities', 'Other', 'Food', 'Bills']
const statusCycle: Record<string, string> = { unpaid: 'partial', partial: 'paid', paid: 'unpaid' }

interface ExpenseItem {
  id: string; name: string; amount: number; category: string; status: string
  paidAmount: number | null; isRecurring: boolean; dueDay: number | null; notes: string | null
  person: { id: string; name: string } | null
  latestPaymentDate: string | null; totalPaidFromPayments: number
  createdAt: string
}

const emptyForm = { name: '', amount: '', category: 'Other', personId: '', isRecurring: true, dueDay: '', notes: '' }

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState<'recurring' | 'extra'>('recurring')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const [quickPay, setQuickPay] = useState<{ expenseId: string; name: string; amount: string; date: string } | null>(null)
  const [paying, setPaying] = useState(false)

  const params = new URLSearchParams({ month: String(month), year: String(year) })
  if (statusFilter) params.set('status', statusFilter)

  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/expenses?${params}`, fetcher)
  const { data: people } = useSWR('/api/people', fetcher)

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }

  function openAdd() { setEditId(null); setForm(emptyForm); setFormError(''); setShowForm(true) }
  function openEdit(item: ExpenseItem) {
    setEditId(item.id)
    setForm({ name: item.name, amount: String(item.amount), category: item.category, personId: item.person?.id || '', isRecurring: item.isRecurring, dueDay: item.dueDay ? String(item.dueDay) : '', notes: item.notes || '' })
    setFormError('')
    setShowForm(true)
  }

  function validate() {
    if (!form.name.trim()) { setFormError('Name is required'); return false }
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) < 0) { setFormError('Valid amount is required'); return false }
    if (form.dueDay) { const d = parseInt(form.dueDay); if (d < 1 || d > 31) { setFormError('Due day must be 1-31'); return false } }
    return true
  }

  async function handleSubmit() {
    if (!validate()) return
    setSaving(true)
    const body = { name: form.name, amount: parseFloat(form.amount), category: form.category, personId: form.personId || null, isRecurring: form.isRecurring, dueDay: form.dueDay ? parseInt(form.dueDay) : null, notes: form.notes || null, month, year }
    if (editId) await fetch(`/api/expenses/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await refetch(); setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleDelete(id: string) { await fetch(`/api/expenses/${id}`, { method: 'DELETE' }); await refetch(); setDeleteId(null) }

  async function toggleStatus(id: string, currentStatus: string) {
    const nextStatus = statusCycle[currentStatus] || 'paid'
    await fetch(`/api/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) })
    await refetch()
  }

  async function handleQuickPay() {
    if (!quickPay || !quickPay.amount) return
    setPaying(true)
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(quickPay.amount), method: 'cash', expenseId: quickPay.expenseId, paymentDate: quickPay.date || undefined }) })
    await refetch(); setQuickPay(null); setPaying(false)
  }

  const categories = [...new Set([...presetCategories, ...(data?.items || []).map((i: { category: string }) => i.category)])].sort()

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-32 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={4} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load expenses" onRetry={() => refetch()} /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Expenses</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add Expense</button>
      </div>

      <div className="flex items-center justify-center bg-surface rounded-[12px] shadow-elevation-1 p-3 gap-4">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Previous month">&larr;</button>
        <h2 className="text-title-large font-normal text-on-surface">{monthNames[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Next month">&rarr;</button>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface rounded-[12px] shadow-elevation-1 p-4 text-center"><p className="text-label-medium text-on-surface-variant mb-0.5">Total</p><p className="text-title-medium font-normal text-on-surface">{formatMMK(data.totalAmount)}</p></div>
          <div className="bg-tertiary-container rounded-[12px] shadow-elevation-1 p-4 text-center"><p className="text-label-medium text-on-tertiary-container mb-0.5">Paid</p><p className="text-title-medium font-normal text-on-tertiary-container">{formatMMK(data.totalPaid)}</p></div>
          <div className="bg-error-container rounded-[12px] shadow-elevation-1 p-4 text-center"><p className="text-label-medium text-on-error-container mb-0.5">Remaining</p><p className="text-title-medium font-normal text-on-error-container">{formatMMK(data.totalRemaining)}</p></div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Chip label="All" selected={!statusFilter} onClick={() => setStatusFilter('')} />
        {['paid', 'unpaid', 'partial'].map(s => <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} />)}
      </div>

      {(!data || data.items.length === 0) ? (
        <EmptyState title="No expenses" description="Add your first expense for this month" action="Add Expense" onAction={openAdd} />
      ) : (() => {
        const recurringItems: ExpenseItem[] = data.items.filter((i: ExpenseItem) => i.isRecurring)
        const extraItems: ExpenseItem[] = data.items.filter((i: ExpenseItem) => !i.isRecurring)
        const activeItems = tab === 'recurring' ? recurringItems : extraItems
        const activeCategories: string[] = [...new Set(activeItems.map((i: { category: string }) => i.category))].sort()

        const renderCategoryGroup = (category: string, catItems: ExpenseItem[]) => {
          const catTotal = catItems.reduce((s: number, i: { amount: number }) => s + i.amount, 0)
          const catPaid = catItems.filter((i: { status: string }) => i.status === 'paid').reduce((s: number, i: { amount: number }) => s + i.amount, 0)
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-label-large text-on-surface-variant font-medium uppercase tracking-wider">{category}</h3>
                <span className="text-label-medium text-on-surface-variant">{formatMMK(catPaid)} / {formatMMK(catTotal)}</span>
              </div>
              <div className="space-y-1.5">
                {catItems.map((item: ExpenseItem) => {
                  const statusIcon = item.status === 'paid' ? '✓' : item.status === 'partial' ? '◐' : '○'
                  const statusColor = item.status === 'paid' ? 'text-tertiary border-tertiary' : item.status === 'partial' ? 'text-[#e65100] border-[#e65100]' : 'text-on-surface-variant border-outline'
                  const dateLabel = item.latestPaymentDate ? formatDate(item.latestPaymentDate) : (item.status === 'paid' ? 'Paid' : '')
                  const itemDate = item.dueDay ? `Due: ${item.dueDay} ${monthNames[month - 1]}` : formatDate(item.createdAt)
                  return (
                    <div key={item.id} className="flex items-center justify-between bg-surface rounded-[12px] shadow-elevation-0 hover:shadow-elevation-1 px-4 py-3 transition-shadow min-h-[48px]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button onClick={() => toggleStatus(item.id, item.status)}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-sm ${statusColor} transition-all hover:scale-110`}
                          aria-label={`Toggle status for ${item.name}`}>{statusIcon}</button>
                        <div className="min-w-0">
                          <Link href={`/expenses/${item.id}`} className="text-body-large text-on-surface hover:text-primary truncate block">{item.name}</Link>
                          <span className="text-label-small text-on-surface-variant">{itemDate}{item.person ? ` \u00b7 ${item.person.name}` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <div className="text-right">
                          <span className={`text-label-large font-medium block ${item.status === 'paid' ? 'text-tertiary' : item.status === 'partial' ? 'text-[#e65100]' : 'text-error'}`}>
                            {formatMMK(item.amount)}
                          </span>
                          {dateLabel && <span className="text-label-small text-on-surface-variant block">{dateLabel}</span>}
                        </div>
                        <button onClick={() => setQuickPay({ expenseId: item.id, name: item.name, amount: '', date: new Date().toISOString().split('T')[0] })} className="px-3 py-2 text-label-medium text-tertiary hover:bg-tertiary/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]" title="Quick pay" aria-label={`Quick pay ${item.name}`}>$</button>
                        <button onClick={() => openEdit(item)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-primary hover:bg-primary/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]" aria-label={`Edit ${item.name}`}>Edit</button>
                        <button onClick={() => setDeleteId(item.id)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-error hover:bg-error/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]" aria-label={`Delete ${item.name}`}>Del</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        return (
          <div className="space-y-4">
            <div className="flex gap-1 bg-surface-container-high rounded-[12px] p-1">
              <button onClick={() => setTab('recurring')}
                className={`flex-1 px-4 py-2.5 rounded-[8px] text-label-large font-medium transition-all ${
                  tab === 'recurring' ? 'bg-surface text-primary shadow-elevation-1' : 'text-on-surface-variant hover:text-on-surface'
                }`}>
                Recurring ({recurringItems.length})
              </button>
              <button onClick={() => setTab('extra')}
                className={`flex-1 px-4 py-2.5 rounded-[8px] text-label-large font-medium transition-all ${
                  tab === 'extra' ? 'bg-surface text-primary shadow-elevation-1' : 'text-on-surface-variant hover:text-on-surface'
                }`}>
                Extra ({extraItems.length})
              </button>
            </div>

            {activeItems.length === 0 ? (
              <p className="text-body-medium text-on-surface-variant py-6 text-center">{tab === 'recurring' ? 'No recurring expenses this month' : 'No extra expenses this month'}</p>
            ) : (
              activeCategories.map(cat => {
                const catItems = activeItems.filter((i: { category: string }) => i.category === cat)
                if (catItems.length === 0) return null
                return renderCategoryGroup(cat, catItems)
              })
            )}
          </div>
        )
      })()}

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Expense' : 'Add Expense'}>
        {formError && <p className="text-label-medium text-error bg-error-container p-2 rounded-[8px]">{formError}</p>}
        <div className="space-y-3">
          <div><label className="text-label-medium text-on-surface-variant">Name *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Expense name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <div><label className="text-label-medium text-on-surface-variant">Category</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="text-label-medium text-on-surface-variant">Person</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" value={form.personId} onChange={e => setForm({ ...form, personId: e.target.value })}><option value="">None</option>{people && people.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="text-label-medium text-on-surface-variant">Due day (1-31)</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" min="1" max="31" placeholder="Day of month" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></div>
          <label className="flex items-center gap-3 text-body-large text-on-surface cursor-pointer min-h-[44px]"><input type="checkbox" checked={form.isRecurring} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} className="w-5 h-5 rounded-[4px] accent-primary" /> Recurring monthly</label>
          <div><label className="text-label-medium text-on-surface-variant">Notes</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Quick Pay Modal */}
      <Modal open={!!quickPay} onClose={() => setQuickPay(null)} title={`Pay: ${quickPay?.name || ''}`}>
        <div className="space-y-3">
          <p className="text-body-medium text-on-surface-variant">Record a payment for this expense</p>
          <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={quickPay?.amount || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, amount: e.target.value } : null)} autoFocus /></div>
          <div><label className="text-label-medium text-on-surface-variant">Date</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="date" value={quickPay?.date || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setQuickPay(null)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleQuickPay} disabled={paying || !quickPay?.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{paying ? 'Paying...' : 'Pay'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message={`Delete "${data?.items?.find((i: ExpenseItem) => i.id === deleteId)?.name}"?`} />
    </div>
  )
}
