'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { formatMMK } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusBadge from '@/components/ui/StatusBadge'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const emptyForm = { name: '', lender: '', principal: '', balance: '', interestRate: '', monthlyPayment: '', termMonths: '', startDate: '' }

export default function LoansPage() {
  const { data, error, isLoading, mutate: refetch } = useSWR('/api/loans', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null)
  const [undoingLoanId, setUndoingLoanId] = useState<string | null>(null)

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-28 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={3} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load loans" onRetry={() => refetch()} /></div>

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(loan: { id: string; name: string; lender: string | null; principal: number; balance: number; interestRate: number; monthlyPayment: number; termMonths: number; startDate?: string }) {
    setEditId(loan.id); setForm({ name: loan.name, lender: loan.lender || '', principal: String(loan.principal), balance: String(loan.balance), interestRate: String(loan.interestRate), monthlyPayment: String(loan.monthlyPayment), termMonths: String(loan.termMonths), startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '' })
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!form.name || !form.principal) return
    setSaving(true)
    const body = { name: form.name, lender: form.lender || null, principal: parseFloat(form.principal), balance: parseFloat(form.balance) || parseFloat(form.principal), interestRate: parseFloat(form.interestRate) || 0, monthlyPayment: parseFloat(form.monthlyPayment) || 0, termMonths: parseInt(form.termMonths) || 0, startDate: form.startDate || new Date().toISOString() }
    if (editId) await fetch(`/api/loans/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await refetch(); setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleDelete(id: string) { await fetch(`/api/loans/${id}`, { method: 'DELETE' }); await refetch(); setDeleteId(null) }

  async function handlePayThisMonth(loanId: string, loanMonthlyPayment: number) {
    setPayingLoanId(loanId)
    await fetch(`/api/loans/${loanId}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: loanMonthlyPayment }) })
    await refetch()
    setPayingLoanId(null)
  }

  async function handleUndoPay(loanId: string) {
    setUndoingLoanId(loanId)
    await fetch(`/api/loans/${loanId}/pay/undo`, { method: 'DELETE' })
    await refetch()
    setUndoingLoanId(null)
  }

  const totalBalance = Array.isArray(data) ? data.reduce((s: number, l: { balance: number }) => s + l.balance, 0) : 0
  const totalMonthly = Array.isArray(data) ? data.reduce((s: number, l: { monthlyPayment: number }) => s + l.monthlyPayment, 0) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Loans</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add Loan</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-error-container rounded-[12px] shadow-elevation-1 p-5"><p className="text-label-medium text-on-error-container">Total Balance</p><p className="text-title-large font-normal text-on-error-container mt-1">{formatMMK(totalBalance)}</p></div>
        <div className="bg-primary-container rounded-[12px] shadow-elevation-1 p-5"><p className="text-label-medium text-on-primary-container">Total Monthly Payment</p><p className="text-title-large font-normal text-on-primary-container mt-1">{formatMMK(totalMonthly)}</p></div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Loan' : 'Add Loan'} wide>
        <div className="space-y-3">
          <div><label className="text-label-medium text-on-surface-variant">Name *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary" placeholder="Loan name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-label-medium text-on-surface-variant">Lender</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary" placeholder="Bank name" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-label-medium text-on-surface-variant">Principal *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="number" placeholder="0" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Balance</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="number" placeholder="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Interest Rate (%) <span className="text-on-surface-variant font-normal">e.g. 13 for 13%</span></label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="number" placeholder="Enter %" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Monthly Payment</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="number" placeholder="0" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Term (months)</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="number" placeholder="0" value={form.termMonths} onChange={e => setForm({ ...form, termMonths: e.target.value })} /></div>
            <div><label className="text-label-medium text-on-surface-variant">Start Date</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name || !form.principal} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message="Delete this loan?" />

      {(!data || data.length === 0) ? (
        <EmptyState title="No loans" description="Add your first loan" action="Add Loan" onAction={openAdd} />
      ) : (
        <div className="grid gap-4">
          {data.map((loan: { id: string; name: string; lender: string | null; principal: number; balance: number; interestRate: number; monthlyPayment: number; termMonths: number; status: string; progress: number; remainingMonths: number; monthsPaid: number; currentMonthPaid: boolean }) => (
            <div key={loan.id} className="bg-surface rounded-[12px] shadow-elevation-1 p-5 hover:shadow-elevation-2 transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link href={`/loans/${loan.id}`} className="text-title-medium font-normal text-on-surface hover:text-primary">{loan.name}</Link>
                  <p className="text-body-small text-on-surface-variant">{loan.lender} · {loan.interestRate}% · {loan.monthsPaid || 0} paid / {loan.termMonths} total</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={loan.status === 'active' ? 'active' : 'paid'} />
                  <button onClick={() => openEdit(loan)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-primary hover:bg-primary/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]">Edit</button>
                  <button onClick={() => setDeleteId(loan.id)} className="px-3 py-2 text-label-medium text-on-surface-variant hover:text-error hover:bg-error/8 rounded-[8px] transition-all min-h-[44px] min-w-[44px]">Del</button>
                </div>
              </div>
              <ProgressBar value={loan.progress} label={`Progress`} sublabel={`${loan.progress}%`} color={loan.progress >= 50 ? 'tertiary' : 'primary'} />
              <div className="flex items-center justify-between py-2 my-2 border-y border-outline-variant min-h-[44px]">
                <div className="flex items-center gap-2">
                  <span className="text-body-medium text-on-surface-variant">This Month ({['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()]} {new Date().getFullYear()})</span>
                  <span className={`px-2 py-0.5 text-label-small rounded-full ${loan.currentMonthPaid ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
                    {loan.currentMonthPaid ? 'Paid' : 'Unpaid'}
                  </span>
                  {loan.currentMonthPaid && (
                    <button onClick={() => handleUndoPay(loan.id)}
                      disabled={undoingLoanId === loan.id}
                      className="px-3 py-1.5 text-label-small text-error border border-error rounded-[16px] hover:bg-error/8 disabled:opacity-50 transition-all min-h-[32px]">
                      {undoingLoanId === loan.id ? '...' : 'Undo'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-label-large font-medium text-on-surface">{formatMMK(loan.monthlyPayment)}</span>
                  {!loan.currentMonthPaid && (
                    <button onClick={() => handlePayThisMonth(loan.id, loan.monthlyPayment)}
                      disabled={payingLoanId === loan.id}
                      className="px-4 py-2 text-label-medium text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center gap-1">
                      {payingLoanId === loan.id ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                      {payingLoanId === loan.id ? 'Paying...' : 'Pay This Month'}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-small">
                <div><span className="text-on-surface-variant">Principal</span><p className="text-label-large text-on-surface font-medium">{formatMMK(loan.principal)}</p></div>
                <div><span className="text-on-surface-variant">Balance</span><p className="text-label-large text-error font-medium">{formatMMK(loan.balance)}</p></div>
                <div><span className="text-on-surface-variant">Monthly</span><p className="text-label-large text-on-surface font-medium">{formatMMK(loan.monthlyPayment)}</p></div>
                <div><span className="text-on-surface-variant">Remaining</span><p className="text-label-large text-on-surface font-medium">{loan.remainingMonths} mo</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
