import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const loans = await prisma.loan.findMany({
    include: {
      loanPayments: { orderBy: { paymentDate: 'desc' }, take: 5 }
    },
    orderBy: { createdAt: 'desc' }
  })

  const enriched = loans.map(loan => {
    const monthsPaid = loan.loanPayments.length
    const progress = loan.principal > 0
      ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
      : 0
    const remainingMonths = loan.termMonths - monthsPaid
    return { ...loan, progress, remainingMonths, monthsPaid }
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
