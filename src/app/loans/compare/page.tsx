'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { formatMMK } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ComparePage() {
  const { data: loansData } = useSWR('/api/loans', fetcher)
  const [form, setForm] = useState({ principal: '', rate: '13', term: '144' })
  const [showSched, setShowSched] = useState(false)

  const loans = Array.isArray(loansData) ? loansData : []

  const principal = parseFloat(form.principal) || 0
  const r = parseFloat(form.rate) || 0
  const t = parseInt(form.term) || 0
  const mr = r / 100 / 12

  let monthlyPayment = 0
  let totalPayment = 0
  let totalInterest = 0
  let schedule: { month: number; payment: number; principalPart: number; interestPart: number; remainingBalance: number }[] = []

  if (principal > 0 && t > 0) {
    if (mr > 0) {
      monthlyPayment = Math.round(principal * mr * Math.pow(1 + mr, t) / (Math.pow(1 + mr, t) - 1))
    } else {
      monthlyPayment = Math.round(principal / t)
    }
    totalPayment = monthlyPayment * t
    totalInterest = Math.max(0, totalPayment - principal)

    let remaining = principal
    for (let i = 1; i <= t; i++) {
      const interest = remaining * mr
      const principalPart = monthlyPayment - interest
      remaining = Math.max(0, remaining - principalPart)
      schedule.push({
        month: i,
        payment: monthlyPayment,
        principalPart: Math.round(principalPart),
        interestPart: Math.round(interest),
        remainingBalance: Math.round(remaining),
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/loans" className="text-label-large text-primary hover:underline">&larr; Back to Loans</Link>
        <h1 className="text-headline-small font-normal text-on-surface">Loan Calculator</h1>
      </div>

      {loans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-title-medium font-normal text-on-surface">Current Loan</h2>
          {loans.map((loan: { id: string; name: string; principal: number; balance: number; monthlyPayment: number; remainingMonths: number }) => (
            <div key={loan.id} className="bg-surface rounded-[12px] shadow-elevation-1 p-4">
              <h3 className="text-title-small font-medium text-on-surface mb-2">{loan.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-body-small">
                <div>
                  <span className="text-on-surface-variant">Principal</span>
                  <p className="text-label-large font-medium text-on-surface">{formatMMK(loan.principal)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant">Balance</span>
                  <p className="text-label-large font-medium text-error">{formatMMK(loan.balance)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant">Monthly</span>
                  <p className="text-label-large font-medium text-on-surface">{formatMMK(loan.monthlyPayment)}</p>
                </div>
                <div>
                  <span className="text-on-surface-variant">Remaining</span>
                  <p className="text-label-large font-medium text-on-surface">{loan.remainingMonths} mo</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface rounded-[12px] shadow-elevation-1 p-5">
        <p className="text-body-medium text-on-surface-variant mb-4">Enter loan amount, interest rate, and term to calculate your monthly payment.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-label-medium text-on-surface-variant">Principal</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="e.g. 100000000" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Interest Rate (%)</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="e.g. 13" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
          </div>
          <div>
            <label className="text-label-medium text-on-surface-variant">Term (months)</label>
            <input className="w-full mt-1 border border-outline-variant rounded-[8px] px-4 py-3 text-body-large bg-surface focus:outline-none focus:border-primary transition-colors" type="number" placeholder="e.g. 144" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} />
          </div>
        </div>

        {monthlyPayment > 0 && (
          <div className="bg-primary-container rounded-[12px] p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-small">
              <div>
                <span className="text-on-primary-container">Monthly Payment</span>
                <p className="text-title-medium font-normal text-on-primary-container">{formatMMK(monthlyPayment)}</p>
              </div>
              <div>
                <span className="text-on-primary-container">Total Payment</span>
                <p className="text-title-medium font-normal text-on-primary-container">{formatMMK(totalPayment)}</p>
              </div>
              <div>
                <span className="text-on-primary-container">Total Interest</span>
                <p className="text-title-medium font-normal text-error">{formatMMK(totalInterest)}</p>
              </div>
              <div>
                <span className="text-on-primary-container">Term</span>
                <p className="text-title-medium font-normal text-on-primary-container">{t} months</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {schedule.length > 0 && (
        <div className="bg-surface rounded-[12px] shadow-elevation-1 p-5">
          <button onClick={() => setShowSched(!showSched)} className="w-full text-left flex justify-between items-center text-title-medium font-normal text-on-surface hover:text-primary transition-colors min-h-[44px]">
            Amortization Schedule<span className="text-label-large text-on-surface-variant">{showSched ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showSched && (
            <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto -mx-3 px-3">
              <table className="w-full text-body-medium min-w-[500px]">
                <thead className="sticky top-0 bg-surface-container"><tr className="text-left text-on-surface-variant"><th className="py-3 px-3 font-medium w-10">#</th><th className="py-3 px-3 font-medium">Payment</th><th className="py-3 px-3 font-medium">Principal</th><th className="py-3 px-3 font-medium hidden sm:table-cell">Interest</th><th className="py-3 px-3 text-right font-medium">Balance</th></tr></thead>
                <tbody>{schedule.map(r => (
                  <tr key={r.month} className="border-t border-outline-variant"><td className="py-2.5 px-3 text-on-surface-variant">{r.month}</td><td className="py-2.5 px-3 text-on-surface">{formatMMK(r.payment)}</td><td className="py-2.5 px-3 text-tertiary">{formatMMK(r.principalPart)}</td><td className="py-2.5 px-3 text-error hidden sm:table-cell">{formatMMK(r.interestPart)}</td><td className="py-2.5 px-3 text-right text-on-surface font-medium">{formatMMK(r.remainingBalance)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
