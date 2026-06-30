'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { formatMMK, formatDate, monthNames } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PaymentsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [personFilter, setPersonFilter] = useState('')
  const [expenseFilter, setExpenseFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', method: 'cash', personId: '', expenseId: '', date: '' })

  const [newExpense, setNewExpense] = useState(false)
  const [newExpForm, setNewExpForm] = useState({ name: '', amount: '', category: 'Other' })

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }

  const params = new URLSearchParams({ month: String(month), year: String(year) })
  if (personFilter) params.set('personId', personFilter)
  if (expenseFilter) params.set('expenseId', expenseFilter)

  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/payments?${params}`, fetcher)
  const { data: people } = useSWR('/api/people', fetcher)
  const { data: expensesData, mutate: refetchExpenses } = useSWR(`/api/expenses?month=${month}&year=${year}`, fetcher)

  async function handleNewExpenseAndSelect() {
    if (!newExpForm.name || !newExpForm.amount) return
    setSaving(true)
    const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newExpForm.name, amount: parseFloat(newExpForm.amount), category: newExpForm.category, month, year }) })
    const created = await res.json()
    await refetchExpenses()
    setForm({ ...form, expenseId: created.id })
    setNewExpense(false)
    setNewExpForm({ name: '', amount: '', category: 'Other' })
    setSaving(false)
  }

  async function handleSubmit() {
    if (!form.amount) return
    setSaving(true)
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(form.amount), method: form.method, personId: form.personId || null, expenseId: form.expenseId || null, paymentDate: form.date || undefined }) })
    await refetch()
    setShowForm(false); setForm({ amount: '', method: 'cash', personId: '', expenseId: '', date: '' }); setSaving(false)
  }

  async function handleDelete(id: string) { await fetch(`/api/payments/${id}`, { method: 'DELETE' }); await refetch(); setDeleteId(null) }

  const payments = Array.isArray(data) ? data : []
  const total = payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0)

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-36 bg-on-surface/10 rounded-full animate-pulse" /><TableSkeleton rows={5} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load payments" onRetry={() => refetch()} /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Payments</h1>
        <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Record Payment</button>
      </div>

      <div className="flex items-center justify-center bg-surface rounded-[12px] shadow-elevation-1 p-3 gap-4">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all">&larr;</button>
        <h2 className="text-title-large font-normal text-on-surface">{monthNames[month - 1]} {year}</h2>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] hover:bg-surface-container-high text-on-surface-variant transition-all">&rarr;</button>
      </div>

      <div className="bg-tertiary-container rounded-[12px] shadow-elevation-1 p-5"><p className="text-label-medium text-on-tertiary-container">Total Payments</p><p className="text-title-large font-normal text-on-tertiary-container mt-1">{formatMMK(total)}</p></div>

      <div className="flex gap-3 flex-wrap items-center bg-surface rounded-[12px] shadow-elevation-1 p-4">
        <select className="border border-outline-variant rounded-[8px] px-4 py-2.5 text-body-medium bg-surface min-h-[44px]" value={personFilter} onChange={e => setPersonFilter(e.target.value)}><option value="">All people</option>{people && people.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className="border border-outline-variant rounded-[8px] px-4 py-2.5 text-body-medium bg-surface min-h-[44px]" value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)}><option value="">All expenses</option>{expensesData?.items && expensesData.items.map((e: { id: string; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </div>

      {/* Record Payment Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setNewExpense(false) }} title={newExpense ? 'New Expense' : 'Record Payment'}>
        {newExpense ? (
          <div className="space-y-3">
            <p className="text-body-medium text-on-surface-variant">Add a new expense, then continue recording payment</p>
            <div><label className="text-label-medium text-on-surface-variant">Name *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary" placeholder="Expense name" value={newExpForm.name} onChange={e => setNewExpForm({ ...newExpForm, name: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary" type="number" placeholder="0" value={newExpForm.amount} onChange={e => setNewExpForm({ ...newExpForm, amount: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Category</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" value={newExpForm.category} onChange={e => setNewExpForm({ ...newExpForm, category: e.target.value })}><option>Family</option><option>Groceries</option><option>Housing</option><option>Baby</option><option>Personal</option><option>Utilities</option><option>Other</option><option>Food</option><option>Bills</option></select></div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setNewExpense(false)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Back</button>
              <button onClick={handleNewExpenseAndSelect} disabled={saving || !newExpForm.name || !newExpForm.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Create</button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary" type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="text-label-medium text-on-surface-variant">Method</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_wallet">Mobile Wallet</option></select></div>
              <div>
                <label className="text-label-medium text-on-surface-variant">Expense (optional)</label>
                <div className="flex gap-2 mt-1">
                  <select className="flex-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface min-h-[44px]" value={form.expenseId} onChange={e => { if (e.target.value === '__new__') { setNewExpense(true); setNewExpForm({ name: '', amount: '', category: 'Other' }) } else setForm({ ...form, expenseId: e.target.value }) }}>
                    <option value="">No expense</option>
                    {expensesData?.items && expensesData.items.map((e: { id: string; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    <option value="__new__">+ New Expense</option>
                  </select>
                </div>
              </div>
              <div><label className="text-label-medium text-on-surface-variant">Who did you pay? (optional)</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" value={form.personId} onChange={e => setForm({ ...form, personId: e.target.value })}><option value="">Not a person</option>{people && people.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="text-label-medium text-on-surface-variant">Date</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message="Delete this payment?" />

      {payments.length === 0 ? (
        <EmptyState title="No payments" description="Record your first payment" action="Record Payment" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 overflow-x-auto">
          <table className="w-full text-body-medium">
            <thead className="border-b border-outline-variant"><tr className="text-left text-on-surface-variant"><th className="py-3 px-4 font-medium">Amount</th><th className="py-3 px-4 font-medium">Method</th><th className="py-3 px-4 font-medium">Person</th><th className="py-3 px-4 font-medium">Expense</th><th className="py-3 px-4 font-medium">Date</th><th className="py-3 px-4 text-right font-medium"></th></tr></thead>
            <tbody>
              {payments.map((p: { id: string; amount: number; method: string; paymentDate: string; person: { name: string } | null; expense: { name: string } | null }) => (
                <tr key={p.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                  <td className="py-3 px-4 text-on-surface font-medium">{formatMMK(p.amount)}</td>
                  <td className="py-3 px-4 text-on-surface-variant capitalize">{p.method.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{p.person?.name || '-'}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{p.expense?.name || '-'}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{formatDate(p.paymentDate)}</td>
                  <td className="py-3 px-4 text-right"><button onClick={() => setDeleteId(p.id)} className="px-3 py-2 text-label-medium text-error hover:bg-error/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]">Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
