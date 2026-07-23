import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isDeleted: false },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  let uuid = body.uuid || undefined
  if (!uuid) {
    const existing = await prisma.category.findUnique({ where: { name: body.name } })
    if (existing?.uuid) uuid = existing.uuid
  }
  const category = await prisma.category.upsert({
    where: { name: body.name },
    update: { icon: body.icon, color: body.color, uuid: uuid || randomUUID(), isPlanBudget: body.isPlanBudget ?? false, budgetAmount: body.budgetAmount ?? null },
    create: { name: body.name, icon: body.icon || '📌', color: body.color || '#3867a0', uuid: randomUUID(), isPlanBudget: body.isPlanBudget ?? false, budgetAmount: body.budgetAmount ?? null }
  })
  return NextResponse.json(category, { status: 201 })
}
