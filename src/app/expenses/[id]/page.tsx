'use client'

import useSWR, { mutate } from 'swr'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatMMK, formatDate } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatusBadge from '@/components/ui/StatusBadge'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/expenses/${id}`, fetcher)
  const { data: people } = useSWR('/api/people', fetcher)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', category: '', personId: '', month: '', year: '', dueDay: '', isRecurring: false, notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [quickPay, setQuickPay] = useState<{ amount: string; method: string; date: string } | null>(null)
  const [paying, setPaying] = useState(false)

  if (isLoading) return <div className="max-w-2xl mx-auto space-y-6 py-4"><div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" /><CardSkeleton /></div>
  if (error) return <div className="max-w-2xl mx-auto py-4"><ErrorState message="Failed to load expense" onRetry={() => refetch()} /></div>

  function startEdit() { setForm({ name: data.name, amount: String(data.amount), category: data.category, personId: data.person?.id || '', month: String(data.month), year: String(data.year), dueDay: data.dueDay ? String(data.dueDay) : '', isRecurring: data.isRecurring, notes: data.notes || '' }); setEditing(true) }
  async function handleEdit() { setSaving(true); await fetch(`/api/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, amount: parseFloat(form.amount), category: form.category, personId: form.personId || null, month: parseInt(form.month), year: parseInt(form.year), dueDay: form.dueDay ? parseInt(form.dueDay) : null, isRecurring: form.isRecurring, notes: form.notes }) }); await refetch(); setEditing(false); setSaving(false) }
  async function handleDelete() { await fetch(`/api/expenses/${id}`, { method: 'DELETE' }); router.push('/expenses') }

  async function handleQuickPay() {
    if (!quickPay || !quickPay.amount) return
    setPaying(true)
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(quickPay.amount), method: quickPay.method, expenseId: id, paymentDate: quickPay.date || undefined }) })
    await refetch(); setQuickPay(null); setPaying(false)
  }

  const totalPaid = data?.payments?.reduce((s: number, p: { amount: number }) => s + p.amount, 0) || 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <Link href="/expenses" className="text-label-large text-primary hover:underline">&larr; Back to Expenses</Link>
      <ConfirmDialog open={deleteConfirm} onCancel={() => setDeleteConfirm(false)} onConfirm={handleDelete} message={`Delete "${data.name}"?`} />

      {/* Detail Card */}
      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
        <div className="flex items-center justify-between mb-4">
          {editing ? <input className="text-title-large font-normal text-on-surface border border-outline-variant rounded-[8px] px-3 py-2 w-2/3 bg-surface" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /> : <h1 className="text-title-large font-normal text-on-surface">{data.name}</h1>}
          <div className="flex items-center gap-2">
            {editing ? (
              <><button onClick={() => setEditing(false)} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Cancel</button><button onClick={handleEdit} disabled={saving} className="px-4 py-2 text-label-medium text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px]">{saving ? '...' : 'Save'}</button></>
            ) : (
              <><button onClick={() => setQuickPay({ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0] })} className="px-4 py-2 text-label-medium text-tertiary border border-tertiary rounded-[20px] hover:bg-tertiary/8 transition-all min-h-[44px]">$ Pay</button><button onClick={startEdit} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Edit</button><button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 text-label-medium text-error border border-error rounded-[20px] hover:bg-error/8 transition-all min-h-[44px]">Delete</button></>
            )}
          </div>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-3 text-body-medium">
            <div><label className="text-label-small text-on-surface-variant">Amount</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Category</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Month</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" type="number" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Year</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Due Day</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" type="number" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Person</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.personId} onChange={e => setForm({ ...form, personId: e.target.value })}><option value="">None</option>{people && people.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="col-span-2"><label className="text-label-small text-on-surface-variant">Notes</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 col-span-2 min-h-[44px]"><input type="checkbox" checked={form.isRecurring} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} className="w-5 h-5 accent-primary" /> Recurring</label>
          </div>
        ) : (
          <>
            <StatusBadge status={data.status} />
            <div className="grid grid-cols-2 gap-4 mt-4 text-body-medium">
              <div><span className="text-on-surface-variant">Amount</span><p className="text-on-surface font-medium">{formatMMK(data.amount)}</p></div>
              <div><span className="text-on-surface-variant">Category</span><p className="text-on-surface font-medium">{data.category}</p></div>
              <div><span className="text-on-surface-variant">Month</span><p className="text-on-surface font-medium">{data.month}/{data.year}</p></div>
              <div><span className="text-on-surface-variant">Recurring</span><p className="text-on-surface font-medium">{data.isRecurring ? 'Yes' : 'No'}</p></div>
              {data.paidAmount && data.paidAmount > 0 && <div><span className="text-on-surface-variant">Paid Amount</span><p className="text-tertiary font-medium">{formatMMK(data.paidAmount)}</p></div>}
              {data.dueDay && <div><span className="text-on-surface-variant">Due Day</span><p className="text-on-surface font-medium">{data.dueDay}</p></div>}
            </div>
            {data.notes && <div className="mt-4 pt-4 border-t border-outline-variant"><span className="text-label-medium text-on-surface-variant">Notes</span><p className="text-body-medium text-on-surface mt-1">{data.notes}</p></div>}
          </>
        )}
      </div>

      {data.person && !editing && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6"><h2 className="text-title-medium font-normal text-on-surface mb-2">Linked Person</h2><Link href={`/people/${data.person.id}`} className="text-label-large text-primary hover:underline">{data.person.name}</Link></div>
      )}

      {/* Quick Pay Modal */}
      <Modal open={!!quickPay} onClose={() => setQuickPay(null)} title={`Pay: ${data.name}`}>
        <div className="space-y-3">
          <p className="text-body-medium text-on-surface-variant">Record a payment for this expense</p>
          <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={quickPay?.amount || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, amount: e.target.value } : null)} autoFocus /></div>
          <div><label className="text-label-medium text-on-surface-variant">Method</label><select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface" value={quickPay?.method || 'cash'} onChange={e => setQuickPay(prev => prev ? { ...prev, method: e.target.value } : null)}><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_wallet">Mobile Wallet</option></select></div>
          <div><label className="text-label-medium text-on-surface-variant">Date</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface transition-colors" type="date" value={quickPay?.date || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setQuickPay(null)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleQuickPay} disabled={paying || !quickPay?.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{paying ? 'Paying...' : 'Pay'}</button>
        </div>
      </Modal>

      {/* Payment History Timeline */}
      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
        <h2 className="text-title-medium font-normal text-on-surface mb-1">Payment History</h2>
        <p className="text-label-medium text-on-surface-variant mb-4">Total paid: {formatMMK(totalPaid)} of {formatMMK(data.amount)}</p>
        {data.payments && data.payments.length > 0 ? (
          <div className="space-y-0">
            {data.payments.map((p: { id: string; amount: number; paymentDate: string; method: string; person: { name: string } | null }, i: number) => (
              <div key={p.id} className="flex items-start gap-4 py-3 border-b border-outline-variant last:border-0 min-h-[48px]">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {i < data.payments.length - 1 && <div className="w-0.5 flex-1 bg-outline-variant my-1" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-body-large text-on-surface font-medium">{formatMMK(p.amount)}</span>
                    <span className="text-label-medium text-on-surface-variant">{formatDate(p.paymentDate)}</span>
                  </div>
                  <p className="text-body-small text-on-surface-variant mt-0.5">via {p.method}{p.person ? ` · to ${p.person.name}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-medium text-on-surface-variant py-4">No payments recorded yet. Use &quot;$ Pay&quot; to add one.</p>
        )}
      </div>
    </div>
  )
}
