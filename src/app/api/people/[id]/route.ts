import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      expenses: {
        include: { payments: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }]
      },
      payments: {
        include: { expense: true },
        orderBy: { paymentDate: 'desc' },
        take: 50
      },
      balances: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      }
    }
  })
  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalOwed = person.expenses.reduce((s, e) => s + e.amount, 0)
  const totalPaid = person.payments.reduce((s, p) => s + p.amount, 0)

  return NextResponse.json({ ...person, totalOwed, totalPaid })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const person = await prisma.person.update({
    where: { id },
    data: {
      name: body.name,
      nickname: body.nickname,
      relation: body.relation,
      notes: body.notes,
    }
  })
  return NextResponse.json(person)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.person.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
