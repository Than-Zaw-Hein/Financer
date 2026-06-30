import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const income = await prisma.income.upsert({
    where: {
      sourceId_month_year: {
        sourceId: id,
        month: body.month || new Date().getMonth() + 1,
        year: body.year || new Date().getFullYear(),
      }
    },
    update: { amount: body.amount, receivedDate: new Date(body.receivedDate || Date.now()) },
    create: {
      sourceId: id,
      amount: body.amount,
      month: body.month || new Date().getMonth() + 1,
      year: body.year || new Date().getFullYear(),
      receivedDate: new Date(body.receivedDate || Date.now()),
    }
  })

  return NextResponse.json(income, { status: 201 })
}
