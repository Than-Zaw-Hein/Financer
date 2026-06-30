import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const loans = await prisma.loan.findMany({
    include: { loanPayments: { select: { id: true } } }
  })

  const comparison = loans.map(loan => {
    const totalPayments = loan.termMonths * loan.monthlyPayment
    const totalInterest = totalPayments - loan.principal
    const progress = loan.principal > 0
      ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
      : 0

    return {
      name: loan.name,
      status: loan.status,
      principal: loan.principal,
      currentBalance: loan.balance,
      interestRate: loan.interestRate,
      monthlyPayment: loan.monthlyPayment,
      termMonths: loan.termMonths,
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayments),
      totalPaid: loan.totalPaid,
      progress,
      remainingMonths: loan.termMonths - loan.loanPayments.length,
    }
  })

  const monthlyRate = 13.0 / 100 / 12
  const newMonthlyPayment = Math.round(
    109399500 * monthlyRate * Math.pow(1 + monthlyRate, 144) / (Math.pow(1 + monthlyRate, 144) - 1)
  )

  const newOffer = {
    name: 'New Loan Offer',
    principal: 109399500,
    interestRate: 13.0,
    monthlyPayment: newMonthlyPayment,
    termMonths: 144,
  }

  return NextResponse.json({ currentLoans: comparison, newOffer })
}
