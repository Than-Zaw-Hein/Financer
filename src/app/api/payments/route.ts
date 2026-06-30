import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')
  const expenseId = searchParams.get('expenseId')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const where: Record<string, unknown> = {}
  if (personId) where.personId = personId
  if (expenseId) where.expenseId = expenseId
  if (month && year) {
    const m = parseInt(month)
    const y = parseInt(year)
    where.paymentDate = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1)
    }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: { person: true, expense: true },
    orderBy: { paymentDate: 'desc' }
  })

  return NextResponse.json(payments)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  let personId = body.personId || null

  if (!personId && body.expenseId) {
    const expense = await prisma.expense.findUnique({ where: { id: body.expenseId }, select: { personId: true } })
    if (expense?.personId) personId = expense.personId
  }

  const payment = await prisma.payment.create({
    data: {
      amount: body.amount,
      method: body.method || 'cash',
      notes: body.notes,
      personId,
      expenseId: body.expenseId || null,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    }
  })

  if (body.expenseId) {
    const expense = await prisma.expense.findUnique({ where: { id: body.expenseId } })
    if (expense) {
      const allPayments = await prisma.payment.findMany({
        where: { expenseId: body.expenseId }
      })
      const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0)

      let newStatus = 'unpaid'
      if (totalPaid <= 0 || expense.amount <= 0) {
        newStatus = 'unpaid'
      } else if (totalPaid >= expense.amount) {
        newStatus = 'paid'
      } else {
        newStatus = 'partial'
      }

      await prisma.expense.update({
        where: { id: body.expenseId },
        data: {
          status: newStatus,
          paidAmount: totalPaid > 0 ? totalPaid : null
        }
      })
    }
  }

  return NextResponse.json(payment, { status: 201 })
}
