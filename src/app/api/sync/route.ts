import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    orderBy: { name: 'asc' }
  })

  const expenses = await prisma.transaction.findMany({
    where: { month, year, isDeleted: false },
    include: { category: true },
    orderBy: { date: 'desc' }
  })

  const incomes = (await prisma.income.findMany({
    where: { month, year, isDeleted: false },
    include: { source: { select: { name: true } } },
    orderBy: { receivedDate: 'desc' }
  })).map(i => ({ ...i, sourceName: i.source.name }))

  const deletedExpenseUuids = (await prisma.transaction.findMany({
    where: { month, year, isDeleted: true },
    select: { uuid: true }
  })).map(t => t.uuid).filter(Boolean)

  const deletedCategoryUuids = (await prisma.category.findMany({
    where: { isDeleted: true },
    select: { uuid: true }
  })).map(c => c.uuid).filter(Boolean)

  const deletedIncomeUuids = (await prisma.income.findMany({
    where: { month, year, isDeleted: true },
    select: { uuid: true }
  })).map(i => i.uuid).filter(Boolean)

  return NextResponse.json({
    categories, expenses, incomes, month, year,
    deletedUuids: { categories: deletedCategoryUuids, expenses: deletedExpenseUuids, incomes: deletedIncomeUuids }
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const synced = { categories: 0, expenses: 0, income: 0 }
  const skipped = { categories: 0, expenses: 0, income: 0 }

  // ── Process Deletions from Mobile ─────────────────
  if (body.deletedExpenseUuids) {
    for (const uuid of body.deletedExpenseUuids) {
      await prisma.transaction.updateMany({ where: { uuid }, data: { isDeleted: true } })
    }
  }
  if (body.deletedCategoryUuids) {
    for (const uuid of body.deletedCategoryUuids) {
      const cat = await prisma.category.findUnique({ where: { uuid } })
      if (cat) {
        await prisma.transaction.updateMany({ where: { categoryId: cat.id }, data: { categoryId: null } })
        await prisma.category.update({ where: { uuid }, data: { isDeleted: true } })
      }
    }
  }
  if (body.deletedIncomeUuids) {
    for (const uuid of body.deletedIncomeUuids) {
      await prisma.income.updateMany({ where: { uuid }, data: { isDeleted: true } })
    }
  }

  // ── Sync Categories ────────────────────────────
  if (body.categories) {
    for (const c of body.categories) {
      const mobileTime = c.updatedAt ? new Date(c.updatedAt) : null

      if (c.uuid) {
        const existing = await prisma.category.findUnique({ where: { uuid: c.uuid } })
        if (existing) {
          if (existing.isDeleted) {
            skipped.categories++
            continue
          }
          if (mobileTime && existing.updatedAt >= mobileTime) {
            skipped.categories++
            continue
          }
          await prisma.category.update({
            where: { uuid: c.uuid },
            data: {
              name: c.name, icon: c.icon, color: c.color,
              isPlanBudget: 'isPlanBudget' in c ? c.isPlanBudget : existing.isPlanBudget,
              budgetAmount: 'budgetAmount' in c ? c.budgetAmount : existing.budgetAmount,
            }
          })
          synced.categories++
          continue
        }
      }

      // No fallback by name — always create new (prevents offline-rename dupes)
      await prisma.category.create({
        data: { name: c.name, icon: c.icon || '📌', color: c.color || '#3867a0', uuid: c.uuid || randomUUID(), isPlanBudget: c.isPlanBudget ?? false, budgetAmount: c.budgetAmount ?? null }
      })
      synced.categories++
    }
  }

  // ── Sync Expenses → Transactions ───────────────
  if (body.expenses) {
    for (const e of body.expenses) {
      const d = new Date(e.date)
      const expenseMonth = d.getMonth() + 1
      const expenseYear = d.getFullYear()
      const mobileTime = e.updatedAt ? new Date(e.updatedAt) : null

      if (e.uuid) {
        const existing = await prisma.transaction.findUnique({ where: { uuid: e.uuid } })
        if (existing) {
          if (existing.isDeleted) {
            skipped.expenses++
            continue
          }
          if (mobileTime && existing.updatedAt >= mobileTime) {
            skipped.expenses++
            continue
          }
          await prisma.transaction.update({
            where: { uuid: e.uuid },
            data: { amount: e.amount, notes: e.note || null }
          })
          synced.expenses++
          continue
        }
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
          name: e.name || e.category || 'Mobile Import',
          amount: e.amount,
          type: 'EXPENSE',
          categoryId,
          month: expenseMonth,
          year: expenseYear,
          date: d,
          notes: e.note || null,
          method: 'cash',
          uuid: e.uuid || randomUUID(),
        }
      })
      synced.expenses++
    }
  }

  // ── Sync Income ────────────────────────────────
  if (body.income) {
    for (const inc of body.income) {
      const d = new Date(inc.date)
      const incMonth = d.getMonth() + 1
      const incYear = d.getFullYear()
      const mobileTime = inc.updatedAt ? new Date(inc.updatedAt) : null

      if (inc.uuid) {
        const existing = await prisma.income.findUnique({ where: { uuid: inc.uuid } })
        if (existing) {
          if (existing.isDeleted) {
            skipped.income++
            continue
          }
          if (mobileTime && existing.updatedAt >= mobileTime) {
            skipped.income++
            continue
          }
          await prisma.income.update({
            where: { uuid: inc.uuid },
            data: { amount: inc.amount, notes: inc.note || null, receivedDate: d }
          })
          synced.income++
          continue
        }
      }

      const sourceName = inc.note?.trim() || 'Mobile Import'
      let source = await prisma.incomeSource.findFirst({ where: { name: sourceName } })
      if (!source) {
        source = await prisma.incomeSource.create({
          data: { name: sourceName, amount: 0, type: 'other' }
        })
      }

      await prisma.income.upsert({
        where: { sourceId_month_year: { sourceId: source.id, month: incMonth, year: incYear } },
        update: { amount: inc.amount, receivedDate: d, notes: inc.note || null, uuid: inc.uuid || randomUUID() },
        create: { sourceId: source.id, amount: inc.amount, month: incMonth, year: incYear, receivedDate: d, notes: inc.note || null, uuid: inc.uuid || randomUUID() }
      })
      synced.income++
    }
  }

  // ── Return Full Server State ───────────────────
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    orderBy: { name: 'asc' }
  })
  const expenses = await prisma.transaction.findMany({
    where: { month, year, isDeleted: false },
    include: { category: true },
    orderBy: { date: 'desc' }
  })
  const incomes = (await prisma.income.findMany({
    where: { month, year, isDeleted: false },
    include: { source: { select: { name: true } } },
    orderBy: { receivedDate: 'desc' }
  }))

  const deletedExpenseUuids = (await prisma.transaction.findMany({
    where: { month, year, isDeleted: true },
    select: { uuid: true }
  })).map(t => t.uuid).filter(Boolean)

  const deletedCategoryUuids = (await prisma.category.findMany({
    where: { isDeleted: true },
    select: { uuid: true }
  })).map(c => c.uuid).filter(Boolean)

  const deletedIncomeUuids = (await prisma.income.findMany({
    where: { month, year, isDeleted: true },
    select: { uuid: true }
  })).map(i => i.uuid).filter(Boolean)

  return NextResponse.json({
    synced, skipped,
    serverData: {
      categories, expenses, incomes, month, year,
      deletedUuids: { categories: deletedCategoryUuids, expenses: deletedExpenseUuids, incomes: deletedIncomeUuids }
    }
  })
}
