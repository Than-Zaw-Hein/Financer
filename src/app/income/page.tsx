'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { formatMMK, monthNames } from '@/lib/format'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface IncomeSource {
  id: string; name: string; amount: number; type: string
  incomes: { amount: number; month: number; year: number }[]
}

const emptyForm = { name: '', amount: '', type: 'salary' }

export default function IncomePage() {
  const now = new Date()
  const { data, error, isLoading, mutate: refetch } = useSWR('/api/income', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [recordForm, setRecordForm] = useState<{ sourceId: string; amount: string; month: number; year: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [receivingIds, setReceivingIds] = useState<Set<string>>(new Set())

  const [recMonth, setRecMonth] = useState(now.getMonth() + 1)
  const [recYear, setRecYear] = useState(now.getFullYear())

  function openAdd() { setEditId(null); setForm(emptyForm); setShowForm(true) }
  function openEdit(source: IncomeSource) { setEditId(source.id); setForm({ name: source.name, amount: String(source.amount), type: source.type }); setShowForm(true) }

  async function handleSubmit() {
    if (!form.name) return
    setSaving(true)
    const body = { name: form.name, amount: parseFloat(form.amount) || 0, type: form.type }
    if (editId) {
      await fetch(`/api/income/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    await refetch()
    setShowForm(false); setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: string) { await fetch(`/api/income/${id}`, { method: 'DELETE' }); await refetch(); setDeleteId(null) }

  async function handleRecord(sourceId: string) {
    if (!recordForm || !recordForm.amount) return
    setSaving(true)
    await fetch(`/api/income/${sourceId}/record`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(recordForm.amount), month: recordForm.month, year: recordForm.year }),
    })
    await refetch() ; setRecordForm(null) ; setSaving(false)
  }

  async function handleQuickReceive(sourceId: string, amount: number) {
    setReceivingIds(prev => new Set(prev).add(sourceId))
    await fetch(`/api/income/${sourceId}/record`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, month: recMonth, year: recYear }),
    })
    await refetch()
    setReceivingIds(prev => { const next = new Set(prev); next.delete(sourceId); return next })
  }

  if (isLoading) return <div className="max-w-3xl mx-auto space-y-6 py-4"><div className="h-8 w-40 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={3} /></div>
  if (error) return <div className="max-w-3xl mx-auto py-4"><ErrorState message="Failed to load income" onRetry={() => refetch()} /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Income Sources</h1>
        <button onClick={openAdd} className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 transition-all min-h-[44px]">+ Add Source</button>
      </div>

      <div className="bg-primary-container rounded-[12px] shadow-elevation-1 p-5">
        <p className="text-label-medium text-on-primary-container">Total Monthly Income</p>
        <p className="text-headline-small font-normal text-on-primary-container mt-1">{formatMMK(data?.totalMonthly || 0)}</p>
      </div>

      {/* Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Edit Income Source' : 'Add Income Source'}>
        <div className="space-y-3">
          <div>
            <label className="text-label-medium text-on-surface-variant">Name *</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large text-on-surface bg-surface focus:outline-none focus:border-primary transition-colors" placeholder="Source name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Monthly amount</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large text-on-surface bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Type</label>
            <select className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large text-on-surface bg-surface focus:outline-none focus:border-primary transition-colors" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="salary">Salary</option><option value="freelance">Freelance</option><option value="business">Business</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { setShowForm(false); setEditId(null) }} className="flex-1 px-6 py-3 text-label-large text-primary border border-outline rounded-[20px] hover:bg-primary/8 transition-all min-h-[44px]">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name} className="flex-1 px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId!)} message="Delete this income source?" />

      {/* Sources List */}
      {(!data || data.sources.length === 0) ? (
        <EmptyState title="No income sources" description="Add your first income source" action="Add Source" onAction={openAdd} />
      ) : (
        <div className="space-y-3">
          {data.sources.map((source: IncomeSource) => (
            <div key={source.id} className="bg-surface rounded-[12px] shadow-elevation-1 p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-title-medium font-normal text-on-surface">{source.name}</h3>
                  <span className="text-label-small text-on-surface-variant uppercase">{source.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    if (recordForm?.sourceId === source.id) setRecordForm(null)
                    else setRecordForm({ sourceId: source.id, amount: '', month: recMonth, year: recYear })
                  }} className="px-4 py-2 text-label-medium text-tertiary border border-tertiary rounded-[20px] hover:bg-tertiary/8 transition-all min-h-[44px]">
                    {recordForm?.sourceId === source.id ? 'Close ▲' : 'Record'}
                  </button>
                  <button onClick={() => openEdit(source)} className="px-4 py-2 text-label-medium text-on-surface-variant border border-outline rounded-[20px] hover:bg-on-surface/8 transition-all min-h-[44px]">Edit</button>
                  <button onClick={() => setDeleteId(source.id)} className="px-4 py-2 text-label-medium text-error border border-error rounded-[20px] hover:bg-error/8 transition-all min-h-[44px]">Del</button>
                </div>
              </div>
              <p className="text-title-large font-normal text-primary">{formatMMK(source.amount)}/mo</p>
              {(() => {
                const thisMonthRecorded = source.incomes.some(i => i.month === recMonth && i.year === recYear)
                if (thisMonthRecorded) {
                  return <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 text-label-medium text-tertiary bg-tertiary-container rounded-full">Received ✓</span>
                }
                return (
                  <button onClick={() => handleQuickReceive(source.id, source.amount)}
                    disabled={receivingIds.has(source.id)}
                    className="mt-2 px-4 py-2 text-label-medium text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[40px] flex items-center gap-1">
                    {receivingIds.has(source.id) ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    Receive {formatMMK(source.amount)}
                  </button>
                )
              })()}

              {source.incomes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {source.incomes.slice(0, 3).map((inc, i) => (
                    <span key={i} className="text-label-medium text-on-surface-variant bg-surface-container rounded-[8px] px-3 py-1">{formatMMK(inc.amount)} ({monthNames[inc.month-1]} {inc.year})</span>
                  ))}
                </div>
              )}

              {recordForm?.sourceId === source.id && (
                <div className="mt-4 p-4 bg-surface-container rounded-[12px] space-y-3">
                  <div className="flex gap-3 items-center">
                    <select className="border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface" value={recordForm.month} onChange={e => setRecordForm({ ...recordForm, month: parseInt(e.target.value) })}>
                      {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{monthNames[i]}</option>)}
                    </select>
                    <input className="border border-outline-variant rounded-[8px] px-3 py-2 text-body-medium bg-surface w-20" type="number" value={recordForm.year} onChange={e => setRecordForm({ ...recordForm, year: parseInt(e.target.value) || now.getFullYear() })} />
                    <input className="flex-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="Amount" value={recordForm.amount} onChange={e => setRecordForm({ ...recordForm, amount: e.target.value })} autoFocus />
                  </div>
                  <button onClick={() => handleRecord(source.id)} disabled={saving} className="w-full px-6 py-3 text-label-large text-on-primary bg-primary rounded-[20px] hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center justify-center gap-2">
                    {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Record Payment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
