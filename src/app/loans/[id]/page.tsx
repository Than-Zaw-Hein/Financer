'use client'

import useSWR, { mutate } from 'swr'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatMMK, formatDate } from '@/lib/format'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusBadge from '@/components/ui/StatusBadge'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/loans/${id}`, fetcher)
  const { data: amortization } = useSWR(`/api/loans/${id}/amortization`, fetcher)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [showSched, setShowSched] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', lender: '', principal: '', balance: '', interestRate: '', monthlyPayment: '', termMonths: '', startDate: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  if (isLoading) return <div className="max-w-3xl mx-auto space-y-6 py-4"><div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" /><CardSkeleton /></div>
  if (error) return <div className="max-w-3xl mx-auto py-4"><ErrorState message="Failed to load loan" onRetry={() => refetch()} /></div>

  async function handlePay() { if (!payAmount) return; setPaying(true); await fetch(`/api/loans/${id}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(payAmount) }) }); await refetch(); await mutate(`/api/loans/${id}/amortization`); setPayAmount(''); setPaying(false) }
  function startEdit() { setForm({ name: data.name, lender: data.lender || '', principal: String(data.principal), balance: String(data.balance), interestRate: String(data.interestRate), monthlyPayment: String(data.monthlyPayment), termMonths: String(data.termMonths), startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '' }); setEditing(true) }
  async function handleEdit() { setSaving(true); await fetch(`/api/loans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, lender: form.lender, principal: parseFloat(form.principal), balance: parseFloat(form.balance), interestRate: parseFloat(form.interestRate), monthlyPayment: parseFloat(form.monthlyPayment), termMonths: parseInt(form.termMonths), startDate: form.startDate }) }); await refetch(); setEditing(false); setSaving(false) }
  async function handleDelete() { await fetch(`/api/loans/${id}`, { method: 'DELETE' }); router.push('/loans') }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <Link href="/loans" className="text-label-large text-primary hover:underline">&larr; Back to Loans</Link>
      <ConfirmDialog open={deleteConfirm} onCancel={() => setDeleteConfirm(false)} onConfirm={handleDelete} message={`Delete "${data.name}"?`} />

      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
        <div className="flex items-center justify-between mb-4">
          {editing ? (
            <input className="text-title-large font-normal text-on-surface border border-outline-variant rounded-[8px] px-3 py-2 w-2/3 bg-surface" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          ) : (
            <h1 className="text-title-large font-normal text-on-surface">{data.name}</h1>
          )}
          <div className="flex items-center gap-2">
            {editing ? (
              <><button onClick={() => setEditing(false)} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="px-4 py-2 text-label-medium text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px]">{saving ? '...' : 'Save'}</button></>
            ) : (
              <><button onClick={startEdit} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Edit</button>
              <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 text-label-medium text-error border border-error rounded-[20px] hover:bg-error/8 transition-all min-h-[44px]">Delete</button></>
            )}
          </div>
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-3 text-body-medium">
            <div><label className="text-label-small text-on-surface-variant">Lender</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Start Date</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Principal</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="number" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Balance</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Interest Rate %</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="number" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Monthly Payment</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="number" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-label-small text-on-surface-variant">Term (months)</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface text-on-surface" type="number" value={form.termMonths} onChange={e => setForm({ ...form, termMonths: e.target.value })} /></div>
          </div>
        ) : (
          <>
            <StatusBadge status={data.status === 'active' ? 'active' : 'paid'} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-body-medium">
              <div><span className="text-on-surface-variant">Lender</span><p className="text-on-surface font-medium">{data.lender || '-'}</p></div>
              <div><span className="text-on-surface-variant">Principal</span><p className="text-on-surface font-medium">{formatMMK(data.principal)}</p></div>
              <div><span className="text-on-surface-variant">Balance</span><p className="text-error font-medium">{formatMMK(data.balance)}</p></div>
              <div><span className="text-on-surface-variant">Rate</span><p className="text-on-surface font-medium">{data.interestRate}%</p></div>
              <div><span className="text-on-surface-variant">Monthly</span><p className="text-on-surface font-medium">{formatMMK(data.monthlyPayment)}</p></div>
              <div><span className="text-on-surface-variant">Term</span><p className="text-on-surface font-medium">{data.termMonths} mo</p></div>
              <div><span className="text-on-surface-variant">Total Paid</span><p className="text-tertiary font-medium">{formatMMK(data.totalPaid)}</p></div>
              <div><span className="text-on-surface-variant">Months Paid</span><p className="text-on-surface font-medium">{data.loanPayments?.length || 0} / {data.termMonths}</p></div>
              <div><span className="text-on-surface-variant">Progress</span><p className="text-primary font-medium">{data.progress}%</p></div>
            </div>
            <div className="mt-4"><ProgressBar value={data.progress} color={data.progress >= 50 ? 'tertiary' : 'primary'} /></div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-outline-variant">
              <input className="flex-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" type="number" placeholder={formatMMK(data.monthlyPayment)} value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              <button onClick={handlePay} disabled={paying} className="px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center gap-2">{paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{paying ? 'Paying...' : 'Record Payment'}</button>
            </div>
          </>
        )}
      </div>

      {data.loanPayments && data.loanPayments.length > 0 && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
          <h2 className="text-title-medium font-normal text-on-surface mb-3">Payment History</h2>
          <div className="space-y-1.5">
            {data.loanPayments.slice(0, 10).map((p: { id: string; amount: number; principalPart: number; interestPart: number; remainingAfter: number; paymentDate: string }) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-outline-variant last:border-0 text-body-medium min-h-[44px]">
                <div><span className="text-on-surface font-medium">{formatMMK(p.amount)}</span><span className="text-on-surface-variant ml-2 text-body-small">(Principal: {formatMMK(p.principalPart)}, Interest: {formatMMK(p.interestPart)})</span></div>
                <div className="text-right"><div className="text-on-surface-variant">{formatDate(p.paymentDate)}</div><div className="text-body-small text-on-surface-variant">Balance: {formatMMK(p.remainingAfter)}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
        <button onClick={() => setShowSched(!showSched)} className="w-full text-left flex justify-between items-center text-title-medium font-normal text-on-surface hover:text-primary transition-colors min-h-[44px]">
          Amortization Schedule<span className="text-label-large text-on-surface-variant">{showSched ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showSched && amortization && (
          <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto -mx-3 px-3">
            <table className="w-full text-body-medium min-w-[500px]">
              <thead className="sticky top-0 bg-surface-container"><tr className="text-left text-on-surface-variant"><th className="py-3 px-3 font-medium w-10">#</th><th className="py-3 px-3 font-medium">Payment</th><th className="py-3 px-3 font-medium">Principal</th><th className="py-3 px-3 font-medium hidden sm:table-cell">Interest</th><th className="py-3 px-3 text-right font-medium">Balance</th></tr></thead>
              <tbody>{amortization.schedule.map((r: { month: number; payment: number; principalPart: number; interestPart: number; remainingBalance: number }) => (
                <tr key={r.month} className="border-t border-outline-variant"><td className="py-2.5 px-3 text-on-surface-variant">{r.month}</td><td className="py-2.5 px-3 text-on-surface">{formatMMK(r.payment)}</td><td className="py-2.5 px-3 text-tertiary">{formatMMK(r.principalPart)}</td><td className="py-2.5 px-3 text-error hidden sm:table-cell">{formatMMK(r.interestPart)}</td><td className="py-2.5 px-3 text-right text-on-surface font-medium">{formatMMK(r.remainingBalance)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
