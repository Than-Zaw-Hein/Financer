'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { formatMMK } from '@/lib/format'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data, error, isLoading, mutate } = useSWR(`/api/dashboard?month=${month}&year=${year}`, fetcher)

  if (isLoading) return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="max-w-5xl mx-auto py-4">
      <ErrorState message="Failed to load dashboard" onRetry={() => mutate()} />
    </div>
  )

  if (!data) return (
    <div className="max-w-5xl mx-auto py-4">
      <EmptyState title="No data yet" description="Add income sources and expenses to see your dashboard" action="Go to Expenses" onAction={() => window.location.href = '/expenses'} />
    </div>
  )

  const health = data.financialHealth === 'healthy' ? 'healthy'
    : data.surplus < data.totalExpenses * -0.5 ? 'danger' : 'warning'

  const healthStyles: Record<string, string> = {
    healthy: 'bg-tertiary-container text-on-tertiary-container',
    warning: 'bg-secondary-container text-on-secondary-container',
    danger: 'bg-error-container text-on-error-container',
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Previous month">&larr;</button>
          <h1 className="text-headline-small font-normal text-on-surface">{monthNames[month - 1]} {year}</h1>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all" aria-label="Next month">&rarr;</button>
        </div>
        <StatusBadge status={data.financialHealth === 'healthy' ? 'paid' : 'unpaid'} />
      </div>

      {/* Summary Cards */}
      <div className="bg-tertiary-container rounded-[12px] shadow-elevation-1 p-5">
        <p className="text-label-medium text-on-tertiary-container">Cash Available Now</p>
        <p className="text-headline-small font-normal text-on-tertiary-container mt-1">{formatMMK(data.availableCash)}</p>
        <p className="text-label-small text-on-tertiary-container mt-0.5 opacity-80">Balance: {formatMMK(data.startingBalance)} · Received: {formatMMK(data.receivedIncome)} · Pending: {formatMMK(data.pendingIncome)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Income" value={formatMMK(data.totalIncome)} bg="bg-primary-container" text="text-on-primary-container" />
        <SummaryCard label="Expenses" value={formatMMK(data.totalExpenses)} bg="bg-error-container" text="text-on-error-container" />
        <SummaryCard label="Surplus" value={formatMMK(data.surplus)} bg={data.surplus >= 0 ? 'bg-tertiary-container' : 'bg-error-container'} text={data.surplus >= 0 ? 'text-on-tertiary-container' : 'text-on-error-container'} />
      </div>

      {/* Expense Progress */}

      {/* Income Sources + Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
          <h2 className="text-title-medium font-normal text-on-surface mb-3">Income Sources</h2>
          <div className="space-y-2">
            {data.incomeSources.map((s: { name: string; expected: number; actual: number }) => (
              <div key={s.name} className="flex justify-between text-body-medium">
                <span className="text-on-surface-variant">{s.name}</span>
                <span className="text-on-surface font-medium">{formatMMK(s.actual || s.expected)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-6">
          <h2 className="text-title-medium font-normal text-on-surface mb-3">Loan Summary</h2>
          <div className="space-y-2 text-body-medium">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Total Balance</span>
              <span className="text-error font-medium">{formatMMK(data.totalLoanBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Monthly Payment</span>
              <span className="text-on-surface font-medium">{formatMMK(data.totalLoanPayment)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health */}
      <div className={`rounded-[12px] px-5 py-4 text-center text-title-medium font-normal ${healthStyles[health]}`}>
        {health === 'healthy' ? 'Financial Health: Healthy'
          : health === 'danger' ? 'Financial Health: Critical — expenses far exceed income'
          : 'Financial Health: Warning — review your spending'}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, bg, text }: { label: string; value: string; bg: string; text: string }) {
  return (
    <div className={`rounded-[12px] shadow-elevation-1 p-5 ${bg}`}>
      <p className="text-label-medium opacity-80 mb-1">{label}</p>
      <p className={`text-title-large font-normal ${text}`}>{value}</p>
    </div>
  )
}
