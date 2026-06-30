import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sources = await prisma.incomeSource.findMany({
    include: { incomes: { orderBy: [{ year: 'desc' }, { month: 'desc' }] } },
    orderBy: { createdAt: 'asc' }
  })
  const totalMonthly = sources.reduce((s, src) => s + src.amount, 0)
  return NextResponse.json({ sources, totalMonthly })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const source = await prisma.incomeSource.create({
    data: {
      name: body.name,
      amount: body.amount || 0,
      type: body.type || 'salary',
      notes: body.notes,
    }
  })
  return NextResponse.json(source, { status: 201 })
}
