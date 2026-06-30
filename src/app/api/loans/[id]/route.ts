import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { loanPayments: { orderBy: { paymentDate: 'desc' } } }
  })
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const progress = loan.principal > 0
    ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
    : 0

  return NextResponse.json({ ...loan, progress })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const loan = await prisma.loan.update({
    where: { id },
    data: {
      name: body.name,
      lender: body.lender,
      principal: body.principal,
      balance: body.balance,
      interestRate: body.interestRate,
      monthlyPayment: body.monthlyPayment,
      termMonths: body.termMonths,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      status: body.status,
      notes: body.notes,
    }
  })
  return NextResponse.json(loan)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.loan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
