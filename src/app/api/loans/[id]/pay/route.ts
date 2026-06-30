import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const paymentAmount = body.amount || loan.monthlyPayment

  const monthlyRate = loan.interestRate / 100 / 12
  const interestPart = loan.balance * monthlyRate
  const principalPart = paymentAmount - interestPart
  const remainingAfter = loan.balance - principalPart
  const newTotalPaid = loan.totalPaid + paymentAmount

  const loanPayment = await prisma.loanPayment.create({
    data: {
      loanId: id,
      amount: paymentAmount,
      principalPart: Math.max(0, Math.round(principalPart)),
      interestPart: Math.round(interestPart),
      remainingAfter: Math.max(0, Math.round(remainingAfter)),
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      notes: body.notes,
    }
  })

  await prisma.loan.update({
    where: { id },
    data: {
      balance: Math.max(0, remainingAfter),
      totalPaid: newTotalPaid,
      status: remainingAfter <= 0 ? 'paid' : 'active',
    }
  })

  return NextResponse.json(loanPayment, { status: 201 })
}
