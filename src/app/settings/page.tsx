'use client'

import useSWR, { mutate } from 'swr'
import { useState, useEffect } from 'react'
import ErrorState from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function SettingsPage() {
  const { data, error, isLoading, mutate: refetch } = useSWR('/api/settings', fetcher)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await refetch()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="h-8 w-32 bg-on-surface/10 rounded-full animate-pulse" />
      <CardSkeleton />
    </div>
  )
  if (error) return <div className="max-w-lg mx-auto py-4"><ErrorState message="Failed to load settings" onRetry={() => refetch()} /></div>

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <h1 className="text-headline-small font-normal text-on-surface">Settings</h1>

      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6 space-y-6">
        {/* Currency */}
        <div>
          <label className="text-label-medium text-on-surface-variant block mb-1">Currency</label>
          <input
            className="w-full border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface text-on-surface focus:outline-none focus:border-primary transition-colors"
            value={form.currency || 'MMK'}
            onChange={e => setForm({ ...form, currency: e.target.value })}
            placeholder="MMK"
          />
          <p className="text-body-small text-on-surface-variant mt-1">Currency code used throughout the app</p>
        </div>

        {/* Starting Balance */}
        <div>
          <label className="text-label-medium text-on-surface-variant block mb-1">Starting Cash Balance</label>
          <input
            className="w-full border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface text-on-surface focus:outline-none focus:border-primary transition-colors"
            type="number"
            value={form.starting_balance || '0'}
            onChange={e => setForm({ ...form, starting_balance: e.target.value })}
            placeholder="0"
          />
          <p className="text-body-small text-on-surface-variant mt-1">Starting cash for cash flow projections</p>
        </div>

        {/* Default Income */}
        <div>
          <label className="text-label-medium text-on-surface-variant block mb-1">Default Monthly Income</label>
          <input
            className="w-full border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface text-on-surface focus:outline-none focus:border-primary transition-colors"
            type="number"
            value={form.default_income || ''}
            onChange={e => setForm({ ...form, default_income: e.target.value })}
            placeholder="e.g. 1000000"
          />
          <p className="text-body-small text-on-surface-variant mt-1">Default expected income when no income is recorded</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-on-primary rounded-[20px] text-label-large font-medium hover:brightness-90 disabled:opacity-50 transition-all min-h-[44px] flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-label-medium text-tertiary">Saved!</span>}
      </div>

      {/* About */}
      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
        <h2 className="text-title-medium font-normal text-on-surface mb-3">About</h2>
        <div className="text-body-medium text-on-surface-variant space-y-1">
          <p>My Finance — မင်းရဲ့ဘဏ္ဍာရေး</p>
          <p>Version 2.0</p>
          <p>Database: SQLite via Prisma</p>
          <p>Stack: Next.js 16 + M3 Design</p>
        </div>
      </div>
    </div>
  )
}
