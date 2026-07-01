import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const loans = await prisma.loan.findMany({
    include: {
      loanPayments: { orderBy: { paymentDate: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const enriched = loans.map(loan => {
    const monthsPaid = loan.loanPayments.length
    const progress = loan.principal > 0
      ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
      : 0
    const remainingMonths = Math.max(0, loan.termMonths - monthsPaid)
    const currentMonthPaid = loan.loanPayments.some(p =>
      p.paymentDate >= currentMonthStart && p.paymentDate < currentMonthEnd
    )
    return { ...loan, progress, remainingMonths, monthsPaid, currentMonthPaid }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const loan = await prisma.loan.create({
    data: {
      name: body.name,
      lender: body.lender,
      principal: body.principal,
      balance: body.balance || body.principal,
      interestRate: body.interestRate,
      monthlyPayment: body.monthlyPayment,
      termMonths: body.termMonths,
      startDate: new Date(body.startDate),
      status: body.status || 'active',
      notes: body.notes,
    }
  })
  return NextResponse.json(loan, { status: 201 })
}
