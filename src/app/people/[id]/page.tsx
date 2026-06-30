'use client'

import useSWR, { mutate } from 'swr'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatMMK, formatDate } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/people/${id}`, fetcher)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', nickname: '', relation: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [quickPay, setQuickPay] = useState<{ amount: string; date: string } | null>(null)
  const [paying, setPaying] = useState(false)

  if (isLoading) return <div className="max-w-3xl mx-auto space-y-6 py-4"><div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" /><CardSkeleton /></div>
  if (error) return <div className="max-w-3xl mx-auto py-4"><ErrorState message="Failed to load person" onRetry={() => refetch()} /></div>

  function startEdit() { setForm({ name: data.name, nickname: data.nickname || '', relation: data.relation || '', notes: data.notes || '' }); setEditing(true) }
  async function handleEdit() { setSaving(true); await fetch(`/api/people/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); await refetch(); setEditing(false); setSaving(false) }
  async function handleDelete() { await fetch(`/api/people/${id}`, { method: 'DELETE' }); router.push('/people') }

  async function handleQuickPay() {
    if (!quickPay || !quickPay.amount) return
    setPaying(true)
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(quickPay.amount), method: 'cash', personId: id, paymentDate: quickPay.date || undefined }) })
    await refetch(); setQuickPay(null); setPaying(false)
  }

  const remaining = (data?.totalOwed || 0) - (data?.totalPaid || 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <Link href="/people" className="text-label-large text-primary hover:underline">&larr; Back to People</Link>

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
              <><button onClick={() => setEditing(false)} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Cancel</button><button onClick={handleEdit} disabled={saving} className="px-4 py-2 text-label-medium text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px]">{saving ? '...' : 'Save'}</button></>
            ) : (
              <><button onClick={() => setQuickPay({ amount: '', date: new Date().toISOString().split('T')[0] })} className="px-4 py-2 text-label-medium text-tertiary border border-tertiary rounded-[20px] hover:bg-tertiary/8 transition-all min-h-[44px]">$ Pay</button><button onClick={startEdit} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Edit</button><button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 text-label-medium text-error border border-error rounded-[20px] hover:bg-error/8 transition-all min-h-[44px]">Delete</button></>
            )}
          </div>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-3 text-body-medium">
            <div><label className="text-label-small text-on-surface-variant">Nickname</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></div>
            <div><label className="text-label-small text-on-surface-variant">Relation</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-label-small text-on-surface-variant">Notes</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-3 py-2 bg-surface" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        ) : (
          <div className="flex gap-3 text-body-medium text-on-surface-variant">{data.nickname && <span>Nickname: {data.nickname}</span>}{data.relation && <span>Relation: {data.relation}</span>}{data.notes && <span>Notes: {data.notes}</span>}</div>
        )}
      </div>

      {/* Quick Pay Modal */}
      <Modal open={!!quickPay} onClose={() => setQuickPay(null)} title={`Pay: ${data.name}`}>
        <div className="space-y-3">
          <p className="text-body-medium text-on-surface-variant">Record a payment to {data.name}</p>
          <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={quickPay?.amount || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, amount: e.target.value } : null)} autoFocus /></div>
          <div><label className="text-label-medium text-on-surface-variant">Date (optional)</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="date" value={quickPay?.date || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setQuickPay(null)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleQuickPay} disabled={paying || !quickPay?.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{paying ? 'Paying...' : 'Pay'}</button>
        </div>
      </Modal>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-error-container rounded-[12px] shadow-elevation-1 p-4 text-center"><p className="text-label-medium text-on-error-container">To Pay</p><p className="text-title-medium font-normal text-on-error-container">{formatMMK(data.totalOwed)}</p></div>
        <div className="bg-tertiary-container rounded-[12px] shadow-elevation-1 p-4 text-center"><p className="text-label-medium text-on-tertiary-container">Paid</p><p className="text-title-medium font-normal text-on-tertiary-container">{formatMMK(data.totalPaid)}</p></div>
        <div className={`rounded-[12px] shadow-elevation-1 p-4 text-center ${remaining <= 0 ? 'bg-tertiary-container' : 'bg-[#fff3e0]'}`}><p className={`text-label-medium ${remaining <= 0 ? 'text-on-tertiary-container' : 'text-[#e65100]'}`}>Remaining</p><p className={`text-title-medium font-normal ${remaining <= 0 ? 'text-on-tertiary-container' : 'text-[#e65100]'}`}>{formatMMK(remaining)}</p></div>
      </div>

      {data.expenses && data.expenses.length > 0 && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
          <h2 className="text-title-medium font-normal text-on-surface mb-3">Linked Expenses</h2>
          <div className="space-y-1.5">
            {data.expenses.map((e: { id: string; name: string; amount: number; status: string; month: number; year: number }) => (
              <Link key={e.id} href={`/expenses/${e.id}`} className="flex justify-between items-center py-2.5 px-3 hover:bg-surface-container rounded-[8px] transition-colors text-body-medium min-h-[44px]">
                <div><span className="text-on-surface font-medium">{e.name}</span><span className="text-on-surface-variant ml-2">{e.month}/{e.year}</span></div>
                <div className="flex items-center gap-3"><span className={`text-label-small font-medium capitalize px-2 py-0.5 rounded-[8px] ${e.status === 'paid' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>{e.status}</span><span className="text-on-surface font-medium">{formatMMK(e.amount)}</span></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.payments && data.payments.length > 0 && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
          <h2 className="text-title-medium font-normal text-on-surface mb-3">Recent Payments</h2>
          <div className="space-y-2">
            {data.payments.map((p: { id: string; amount: number; paymentDate: string; method: string; expense: { name: string } | null }) => (
              <div key={p.id} className="flex justify-between text-body-medium py-2 border-b border-outline-variant last:border-0 min-h-[44px] items-center">
                <div><span className="text-on-surface font-medium">{formatMMK(p.amount)}</span><span className="text-on-surface-variant ml-2">via {p.method}</span>{p.expense && <span className="text-on-surface-variant ml-2">- {p.expense.name}</span>}</div>
                <div className="text-on-surface-variant">{formatDate(p.paymentDate)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
