import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

const PROTECTED = ['Extra', 'Income']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  let uuid = body.uuid || undefined
  if (!uuid) {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (existing?.uuid) uuid = existing.uuid
  }
  const category = await prisma.category.update({
    where: { id },
    data: { name: body.name, icon: body.icon, color: body.color, uuid: uuid || randomUUID(), isPlanBudget: body.isPlanBudget ?? false, budgetAmount: body.budgetAmount ?? null }
  })
  return NextResponse.json(category)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (PROTECTED.includes(category.name)) {
    return NextResponse.json({ error: 'Cannot delete default category' }, { status: 403 })
  }
  await prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null } })
  await prisma.category.update({ where: { id }, data: { isDeleted: true } })
  return NextResponse.json({ success: true })
}
