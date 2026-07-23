import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const type = searchParams.get('type') || 'EXPENSE'

  const where: Record<string, unknown> = { month, year, isDeleted: false }
  if (type && type !== 'all') where.type = type

  const items = await prisma.transaction.findMany({
    where,
    include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    orderBy: { date: 'desc' }
  })

  const totalAmount = items.reduce((s, i) => s + i.amount, 0)

  return NextResponse.json({ month, year, items, totalAmount })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const m = body.month || new Date().getMonth() + 1
  const y = body.year || new Date().getFullYear()

  const item = await prisma.transaction.create({
    data: {
      amount: body.amount,
      type: 'EXPENSE',
      categoryId: body.categoryId || null,
      name: body.name || null,
      date: body.date ? new Date(new Date(body.date).getTime() + (Date.now() % 86400000)) : new Date(),
      method: body.method || 'cash',
      notes: body.notes || null,
      month: m,
      year: y,
      uuid: randomUUID(),
    }
  })
  return NextResponse.json(item, { status: 201 })
}
