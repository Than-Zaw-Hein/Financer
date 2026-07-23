import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const expenses: { name: string; amount: number; category: string; date: number; note?: string }[] = body.expenses || []
  const incomes: { amount: number; date: number; note?: string }[] = body.income || []

  let importedExpenses = 0
  let skippedExpenses = 0
  let importedIncome = 0
  let skippedIncome = 0

  for (const e of expenses) {
    const d = new Date(e.date)
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    const exists = await prisma.transaction.findFirst({
      where: { amount: e.amount, month, year, type: 'EXPENSE' }
    })

    if (exists) {
      skippedExpenses++
      continue
    }

    let categoryId: string | null = null
    if (e.category) {
      const cat = await prisma.category.upsert({
        where: { name: e.category },
        update: {},
        create: { name: e.category }
      })
      categoryId = cat.id
    }

    await prisma.transaction.create({
      data: {
        name: e.name || null,
        amount: e.amount,
        type: 'EXPENSE',
        categoryId,
        month,
        year,
        date: d,
        method: 'cash',
        notes: e.note || null,
      }
    })
    importedExpenses++
  }

  for (const inc of incomes) {
    const d = new Date(inc.date)
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    let source = await prisma.incomeSource.findFirst()
    if (!source) {
      source = await prisma.incomeSource.create({
        data: { name: 'Mobile Import', amount: inc.amount, type: 'other' }
      })
    }

    const exists = await prisma.income.findFirst({
      where: { sourceId: source.id, month, year }
    })

    if (exists) {
      skippedIncome++
      continue
    }

    await prisma.income.create({
      data: {
        sourceId: source.id,
        amount: inc.amount,
        month,
        year,
        receivedDate: d,
      }
    })
    importedIncome++
  }

  return NextResponse.json({
    imported: { expenses: importedExpenses, income: importedIncome },
    skipped: { expenses: skippedExpenses, income: skippedIncome },
  })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Import API is ready. POST expenses and income arrays.' })
}
