'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { formatMMK } from '@/lib/format'
import ProgressBar from '@/components/ui/ProgressBar'
import ErrorState from '@/components/ui/ErrorState'
import { RowSkeleton } from '@/components/ui/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const FIXED_PAYMENT = 1510000

export default function ComparePage() {
  const { data, error, isLoading } = useSWR('/api/loans/compare', fetcher)
  const [compareForm, setCompareForm] = useState({ rate: '13', term: '144' })

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6 py-4"><div className="h-8 w-48 bg-on-surface/10 rounded-full animate-pulse" /><RowSkeleton lines={3} /></div>
  if (error) return <div className="max-w-4xl mx-auto py-4"><ErrorState message="Failed to load comparison" onRetry={() => {}} /></div>

  const r = parseFloat(compareForm.rate) || 0
  const t = parseInt(compareForm.term) || 0
  const mr = r / 100 / 12

  // Calculate principal from fixed monthly payment
  // principal = payment × [1 − (1 + r)^−n] ÷ r
  const newPrincipal = t > 0 && mr > 0
    ? Math.round(FIXED_PAYMENT * (1 - Math.pow(1 + mr, -t)) / mr)
    : 0
  const newTotal = FIXED_PAYMENT * t
  const newInterest = newTotal - newPrincipal

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/loans" className="text-label-large text-primary hover:underline">&larr; Back to Loans</Link>
        <h1 className="text-headline-small font-normal text-on-surface">Loan Comparison</h1>
      </div>

      {/* Current Loans */}
      <div>
        <h2 className="text-title-medium font-normal text-on-surface mb-3">Current Loans</h2>
        <div className="grid gap-4">
          {data?.currentLoans?.map((loan: { name: string; status: string; principal: number; currentBalance: number; interestRate: number; monthlyPayment: number; termMonths: number; totalInterest: number; totalPayment: number; totalPaid: number; progress: number; remainingMonths: number }) => (
            <div key={loan.name} className="bg-surface rounded-[12px] shadow-elevation-1 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-title-medium font-normal text-on-surface">{loan.name}</h3>
                <span className={`text-label-small font-medium px-3 py-1 rounded-[8px] ${loan.status === 'active' ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-container text-on-tertiary-container'}`}>{loan.status} · {loan.progress}% paid</span>
              </div>
              <ProgressBar value={loan.progress} color={loan.progress >= 50 ? 'tertiary' : 'primary'} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-body-small">
                <div><span className="text-on-surface-variant">Principal</span><p className="text-label-large text-on-surface font-medium">{formatMMK(loan.principal)}</p></div>
                <div><span className="text-on-surface-variant">Balance</span><p className="text-label-large text-error font-medium">{formatMMK(loan.currentBalance)}</p></div>
                <div><span className="text-on-surface-variant">Monthly</span><p className="text-label-large text-on-surface font-medium">{formatMMK(loan.monthlyPayment)}</p></div>
                <div><span className="text-on-surface-variant">Rate / Term</span><p className="text-label-large text-on-surface font-medium">{loan.interestRate}% / {loan.termMonths}mo</p></div>
                <div><span className="text-on-surface-variant">Total Interest</span><p className="text-label-large text-error font-medium">{formatMMK(loan.totalInterest)}</p></div>
                <div><span className="text-on-surface-variant">Total Payment</span><p className="text-label-large text-on-surface font-medium">{formatMMK(loan.totalPayment)}</p></div>
                <div><span className="text-on-surface-variant">Paid So Far</span><p className="text-label-large text-tertiary font-medium">{formatMMK(loan.totalPaid)}</p></div>
                <div><span className="text-on-surface-variant">Remaining</span><p className="text-label-large text-on-surface font-medium">{loan.remainingMonths} mo</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compare Feature */}
      <div>
        <h2 className="text-title-medium font-normal text-on-surface mb-3">Compare with New Loan</h2>
        <p className="text-body-medium text-on-surface-variant mb-3">Fixed monthly payment: {formatMMK(FIXED_PAYMENT)}. Enter rate and term to see what principal you can borrow.</p>
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-label-medium text-on-surface-variant">Monthly Payment (fixed)</label>
              <div className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface-container-high text-on-surface font-medium">{formatMMK(FIXED_PAYMENT)}</div>
            </div>
            <div>
              <label className="text-label-medium text-on-surface-variant">Interest Rate (%)</label>
              <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="e.g. 13" value={compareForm.rate} onChange={e => setCompareForm({ ...compareForm, rate: e.target.value })} />
            </div>
            <div>
              <label className="text-label-medium text-on-surface-variant">Term (months)</label>
              <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="e.g. 144" value={compareForm.term} onChange={e => setCompareForm({ ...compareForm, term: e.target.value })} />
            </div>
          </div>

          {newPrincipal > 0 && (
            <div className="bg-primary-container rounded-[12px] p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-small">
                <div><span className="text-on-primary-container">Principal You Can Borrow</span><p className="text-title-medium font-normal text-on-primary-container">{formatMMK(newPrincipal)}</p></div>
                <div><span className="text-on-primary-container">Total Payment</span><p className="text-title-medium font-normal text-on-primary-container">{formatMMK(Math.round(newTotal))}</p></div>
                <div><span className="text-on-primary-container">Total Interest</span><p className="text-title-medium font-normal text-error">{formatMMK(Math.round(newInterest))}</p></div>
                <div><span className="text-on-primary-container">Term</span><p className="text-title-medium font-normal text-on-primary-container">{t} months</p></div>
              </div>
            </div>
          )}

          {/* Comparison Summary */}
          {data?.currentLoans && data.currentLoans.length > 0 && newPrincipal > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant space-y-2 text-body-medium">
              <p><span className="text-on-surface-variant">Current loan balance:</span> <span className="text-error font-medium">{formatMMK(data.currentLoans.reduce((s: number, l: { currentBalance: number }) => s + l.currentBalance, 0))}</span></p>
              <p><span className="text-on-surface-variant">Monthly payment:</span> <span className="text-on-surface font-medium">{formatMMK(FIXED_PAYMENT)}</span></p>
              <p><span className="text-on-surface-variant">Principal you can borrow:</span> <span className="text-primary font-medium">{formatMMK(newPrincipal)}</span></p>
              <p className="mt-2 pt-2 border-t border-outline-variant">
                <span className="text-on-surface-variant">Balance vs. New Principal:</span>{' '}
                {(data.currentLoans.reduce((s: number, l: { currentBalance: number }) => s + l.currentBalance, 0) - newPrincipal) > 0 ? (
                  <span className="text-error font-medium">
                    You need {formatMMK(data.currentLoans.reduce((s: number, l: { currentBalance: number }) => s + l.currentBalance, 0) - newPrincipal)} more to pay off current loan at these terms.
                  </span>
                ) : (
                  <span className="text-tertiary font-medium">
                    Enough to cover current balance with {formatMMK(newPrincipal - data.currentLoans.reduce((s: number, l: { currentBalance: number }) => s + l.currentBalance, 0))} to spare.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
