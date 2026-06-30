import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  const where: Record<string, unknown> = { month, year }
  if (status) where.status = status
  if (category) where.category = category

  const items = await prisma.expense.findMany({
    where,
    include: { person: true, payments: { orderBy: { paymentDate: 'desc' } } },
    orderBy: { createdAt: 'desc' }
  })

  const enriched = items.map(i => ({
    ...i,
    latestPaymentDate: i.payments[0]?.paymentDate || null,
    totalPaidFromPayments: i.payments.reduce((s, p) => s + p.amount, 0),
  }))

  const totalAmount = enriched.reduce((s, i) => s + i.amount, 0)
  const totalPaid = enriched
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0)
  const totalUnpaid = enriched
    .filter(i => i.status === 'unpaid')
    .reduce((s, i) => s + i.amount, 0)

  return NextResponse.json({
    month, year,
    items: enriched,
    totalAmount,
    totalPaid,
    totalUnpaid,
    totalRemaining: totalAmount - totalPaid
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const item = await prisma.expense.create({
    data: {
      name: body.name,
      amount: body.amount,
      category: body.category || 'Other',
      status: body.status || 'unpaid',
      paidAmount: body.paidAmount,
      month: body.month || new Date().getMonth() + 1,
      year: body.year || new Date().getFullYear(),
      dueDay: body.dueDay,
      isRecurring: body.isRecurring ?? true,
      notes: body.notes,
      personId: body.personId || null,
    }
  })
  return NextResponse.json(item, { status: 201 })
}
