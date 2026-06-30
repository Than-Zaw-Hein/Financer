'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { formatMMK, formatDate } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const emptyForm = { name: '', nickname: '', relation: '' }

export default function PeoplePage() {
  const { data, error, isLoading, mutate: refetch } = useSWR('/api/people', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [quickPay, setQuickPay] = useState<{ personId: string; name: string; amount: string; date: string } | null>(null)
  const [paying, setPaying] = useState(false)

  if (isLoading) return <div className="max-w-3xl mx-auto space-y-6 py-4"><div className="h-8 w-32 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={3} /></div>
  if (error) return <div className="max-w-3xl mx-auto py-4"><ErrorState message="Failed to load people" onRetry={() => refetch()} /></div>

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(p: { id: string; name: string; nickname: string | null; relation: string | null }) { setEditId(p.id); setForm({ name: p.name, nickname: p.nickname || '', relation: p.relation || '' }); setShowForm(true) }

  async function handleSubmit() {
    if (!form.name) return; setSaving(true)
    const body = { name: form.name, nickname: form.nickname || null, relation: form.relation || null }
    if (editId) await fetch(`/api/people/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    else await fetch('/api/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await refetch(); setShowForm(false); setEditId(null); setSaving(false)
  }

  async function handleDelete(id: string) { await fetch(`/api/people/${id}`, { method: 'DELETE' }); await refetch(); setDeleteId(null) }

  async function handleQuickPay() {
    if (!quickPay || !quickPay.amount) return
    setPaying(true)
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(quickPay.amount), method: 'cash', personId: quickPay.personId, paymentDate: quickPay.date || undefined }) })
    await refetch(); setQuickPay(null); setPaying(false)
  }

  const filtered: Array<{ id: string; name: string; nickname: string | null; relation: string | null; totalOwed: number; totalPaid: number; totalPaidThisMonth: number; unpaidCount: number; remaining: number }> = data ? data.filter((p: { name: string }) => p.name.toLowerCase().includes(search.toLowerCase())) : []

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">People</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add Person</button>
      </div>

      {data && Array.isArray(data) && data.length > 5 && (
        <input className="w-full border border-outline-variant rounded-[12px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} />
      )}

      {/* Person Form Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Person' : 'Add Person'}>
        <div className="space-y-3">
          <div><label className="text-label-medium text-on-surface-variant">Name *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-label-medium text-on-surface-variant">Nickname</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Short name" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></div>
          <div><label className="text-label-medium text-on-surface-variant">Relation</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Mother, Brother, Friend" value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>

      {/* Quick Pay Modal */}
      <Modal open={!!quickPay} onClose={() => setQuickPay(null)} title={`Pay: ${quickPay?.name || ''}`}>
        <div className="space-y-3">
          <p className="text-body-medium text-on-surface-variant">Record a payment to this person</p>
          <div><label className="text-label-medium text-on-surface-variant">Amount *</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={quickPay?.amount || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, amount: e.target.value } : null)} autoFocus /></div>
          <div><label className="text-label-medium text-on-surface-variant">Date (optional)</label><input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="date" value={quickPay?.date || ''} onChange={e => setQuickPay(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setQuickPay(null)} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleQuickPay} disabled={paying || !quickPay?.amount} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">{paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{paying ? 'Paying...' : 'Pay'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message="Delete this person?" />

      {filtered.length === 0 ? (
        <EmptyState title="No people found" description={search ? 'Try a different search' : 'Add your first person'} action={search ? undefined : 'Add Person'} onAction={search ? undefined : openAdd} />
      ) : (
        <div className="grid gap-4">
          {filtered.map((person) => (
            <div key={person.id} className="bg-surface rounded-[12px] shadow-elevation-1 p-5 hover:shadow-elevation-2 transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link href={`/people/${person.id}`} className="text-title-medium font-normal text-on-surface hover:text-primary">{person.name}</Link>
                  {[person.nickname, person.relation].filter(Boolean).length > 0 && (
                    <p className="text-body-small text-on-surface-variant">{[person.nickname, person.relation].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuickPay({ personId: person.id, name: person.name, amount: '', date: new Date().toISOString().split('T')[0] })} className="px-4 py-2 text-label-medium text-tertiary border border-tertiary rounded-[20px] hover:bg-tertiary/8 transition-all min-h-[44px]" title="Quick pay">$ Pay</button>
                  <button onClick={() => openEdit(person)} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Edit</button>
                  <button onClick={() => setDeleteId(person.id)} className="px-4 py-2 text-label-medium text-error border border-error rounded-[20px] hover:bg-error/8 transition-all min-h-[44px]">Del</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-body-small">
                <div><span className="text-on-surface-variant">To Pay</span><p className="text-label-large text-error font-medium">{formatMMK(person.totalOwed)}</p></div>
                <div><span className="text-on-surface-variant">Paid</span><p className="text-label-large text-tertiary font-medium">{formatMMK(person.totalPaid)}</p></div>
                <div><span className="text-on-surface-variant">Remaining</span><p className={`text-label-large font-medium ${person.remaining <= 0 ? 'text-tertiary' : 'text-[#e65100]'}`}>{formatMMK(person.remaining)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
