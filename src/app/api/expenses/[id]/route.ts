import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const item = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true }
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const item = await prisma.transaction.update({
    where: { id },
    data: {
      amount: body.amount,
      categoryId: body.categoryId || null,
      name: body.name || null,
      date: body.date ? new Date(body.date) : undefined,
      method: body.method,
      notes: body.notes,
      month: body.month,
      year: body.year,
    }
  })
  return NextResponse.json(item)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.transaction.update({ where: { id }, data: { isDeleted: true } })
  return NextResponse.json({ success: true })
}
