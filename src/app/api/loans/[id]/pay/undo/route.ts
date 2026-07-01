import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lastPayment = await prisma.loanPayment.findFirst({
    where: { loanId: id },
    orderBy: { paymentDate: 'desc' }
  })
  if (!lastPayment) return NextResponse.json({ error: 'No payments to undo' }, { status: 400 })

  const newTotalPaid = loan.totalPaid - lastPayment.amount
  const newBalance = loan.balance + lastPayment.principalPart

  await prisma.loanPayment.delete({ where: { id: lastPayment.id } })
  await prisma.loan.update({
    where: { id },
    data: {
      balance: Math.round(newBalance),
      totalPaid: Math.max(0, newTotalPaid),
      status: newBalance > 0 ? 'active' : 'paid',
    }
  })

  return NextResponse.json({ success: true })
}
