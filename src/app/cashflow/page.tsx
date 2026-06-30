'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { formatMMK, monthNames } from '@/lib/format'
import ErrorState from '@/components/ui/ErrorState'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CashFlowPage() {
  const [months, setMonths] = useState(12)
  const { data, error, isLoading, mutate: refetch } = useSWR(`/api/cashflow?months=${months}`, fetcher)

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" /><TableSkeleton rows={6} cols={5} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load cash flow" onRetry={() => refetch()} /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-small font-normal text-on-surface">Cash Flow</h1>
        <select value={months} onChange={e => setMonths(parseInt(e.target.value))} className="border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface min-h-[44px]">
          <option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-primary-container rounded-[12px] shadow-elevation-1 p-4"><p className="text-label-small text-on-primary-container">Starting Balance</p><p className="text-title-medium font-normal text-on-primary-container mt-1">{formatMMK(data.startingBalance)}</p></div>
        <div className="bg-primary-container rounded-[12px] shadow-elevation-1 p-4"><p className="text-label-small text-on-primary-container">Monthly Income</p><p className="text-title-medium font-normal text-on-primary-container mt-1">{formatMMK(data.monthlyIncome)}</p></div>
        <div className="bg-error-container rounded-[12px] shadow-elevation-1 p-4"><p className="text-label-small text-on-error-container">Recurring Expenses</p><p className="text-title-medium font-normal text-on-error-container mt-1">{formatMMK(data.recurringExpenses)}</p></div>
        <div className="bg-secondary-container rounded-[12px] shadow-elevation-1 p-4"><p className="text-label-small text-on-secondary-container">Loan Payments</p><p className="text-title-medium font-normal text-on-secondary-container mt-1">{formatMMK(data.loanPayments)}</p></div>
        <div className="bg-tertiary-container rounded-[12px] shadow-elevation-1 p-4"><p className="text-label-small text-on-tertiary-container">Total Outgoing</p><p className="text-title-medium font-normal text-on-tertiary-container mt-1">{formatMMK(data.totalMonthlyOutgoing)}</p></div>
      </div>

      {data.currentUnpaid > 0 && (
        <div className="bg-[#fff3e0] text-[#e65100] rounded-[12px] px-5 py-4 text-body-medium">Current unpaid expenses: <span className="font-medium">{formatMMK(data.currentUnpaid)}</span> (included in first month)</div>
      )}

      {/* Projection Table */}
      <div className="bg-surface rounded-[12px] shadow-elevation-1 overflow-x-auto">
        <table className="w-full text-body-medium">
          <thead className="border-b border-outline-variant">
            <tr className="text-left text-on-surface-variant"><th className="py-3 px-4 font-medium">Month</th><th className="py-3 px-4 text-right font-medium">Income</th><th className="py-3 px-4 text-right font-medium">Expenses</th><th className="py-3 px-4 text-right font-medium">Net Cash</th><th className="py-3 px-4 text-right font-medium">Running Balance</th></tr>
          </thead>
          <tbody>
            {data.projection.map((row: { month: number; year: number; label: string; income: number; expenses: number; netCash: number; runningBalance: number }, i: number) => (
              <tr key={i} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                <td className="py-3 px-4 text-on-surface font-medium">{monthNames[row.month - 1]} {row.year}</td>
                <td className="py-3 px-4 text-right text-tertiary font-medium">{formatMMK(row.income)}</td>
                <td className="py-3 px-4 text-right text-error font-medium">{formatMMK(row.expenses)}</td>
                <td className={`py-3 px-4 text-right font-medium ${row.netCash >= 0 ? 'text-tertiary' : 'text-error'}`}>{formatMMK(row.netCash)}</td>
                <td className={`py-3 px-4 text-right font-medium ${row.runningBalance >= 0 ? 'text-primary' : 'text-error'}`}>{formatMMK(row.runningBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
