import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { person: true, payments: { include: { person: true }, orderBy: { paymentDate: 'desc' } } }
  })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(expense)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      name: body.name,
      amount: body.amount,
      category: body.category,
      status: body.status,
      paidAmount: body.paidAmount,
      month: body.month,
      year: body.year,
      dueDay: body.dueDay,
      isRecurring: body.isRecurring,
      notes: body.notes,
      personId: body.personId,
    }
  })
  return NextResponse.json(expense)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
