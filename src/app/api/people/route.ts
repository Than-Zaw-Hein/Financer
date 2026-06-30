import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const people = await prisma.person.findMany({
    include: {
      balances: { where: { month, year } },
      expenses: { where: { month, year }, select: { id: true, name: true, amount: true, status: true } },
      payments: { select: { id: true, amount: true, paymentDate: true } },
    },
    orderBy: { name: 'asc' }
  })

  const withTotals = people.map(p => ({
    ...p,
    totalOwed: p.expenses.reduce((s, e) => s + e.amount, 0),
    totalPaid: p.payments.reduce((s, pmt) => s + pmt.amount, 0),
    totalPaidThisMonth: p.payments
      .filter(pmt => new Date(pmt.paymentDate).getMonth() + 1 === month && new Date(pmt.paymentDate).getFullYear() === year)
      .reduce((s, pmt) => s + pmt.amount, 0),
    unpaidCount: p.expenses.filter(e => e.status !== 'paid').length,
    remaining: p.expenses.reduce((s, e) => s + e.amount, 0) - p.payments.reduce((s, pmt) => s + pmt.amount, 0),
  }))

  return NextResponse.json(withTotals)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const person = await prisma.person.create({
    data: {
      name: body.name,
      nickname: body.nickname,
      relation: body.relation,
      notes: body.notes,
    }
  })
  return NextResponse.json(person, { status: 201 })
}
