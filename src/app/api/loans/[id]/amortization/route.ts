import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const monthlyRate = loan.interestRate / 100 / 12
  let balance = loan.balance
  const schedule = []
  let totalInterest = 0
  let totalPrincipal = 0
  const remainingMonths = Math.min(loan.termMonths, 360)

  for (let i = 1; i <= remainingMonths && balance > 0; i++) {
    const interestPart = balance * monthlyRate
    let principalPart = loan.monthlyPayment - interestPart
    if (principalPart <= 0) principalPart = loan.monthlyPayment
    if (principalPart > balance) { principalPart = balance; balance = 0 }
    else { balance -= principalPart }

    totalInterest += interestPart
    totalPrincipal += principalPart

    schedule.push({
      month: i,
      payment: Math.round(loan.monthlyPayment),
      principalPart: Math.round(principalPart),
      interestPart: Math.round(interestPart),
      remainingBalance: Math.round(balance),
    })
    if (balance <= 0) break
  }

  return NextResponse.json({
    loanName: loan.name,
    principal: loan.principal,
    currentBalance: loan.balance,
    interestRate: loan.interestRate,
    monthlyPayment: loan.monthlyPayment,
    termMonths: loan.termMonths,
    totalInterestOverLife: Math.round(totalInterest),
    totalPaymentOverLife: Math.round(totalPrincipal + totalInterest),
    paymentsRemaining: schedule.length,
    schedule
  })
}
