import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()))

  const incomeSources = await prisma.incomeSource.findMany({
    include: { incomes: { where: { month, year } } }
  })

  const totalIncome = incomeSources.reduce((sum, s) => {
    const actual = s.incomes.reduce((a, i) => a + i.amount, 0)
    return sum + (actual || s.amount)
  }, 0)

  const expenseTxns = await prisma.transaction.findMany({
    where: { month, year, type: 'EXPENSE' }
  })
  const totalExpenses = expenseTxns.reduce((s, e) => s + e.amount, 0)
  const expenseCount = expenseTxns.length

  const surplus = totalIncome - totalExpenses

  const loans = await prisma.loan.findMany()
  const totalLoanBalance = loans.reduce((s, l) => s + l.balance, 0)
  const totalLoanPayment = loans.reduce((s, l) => s + l.monthlyPayment, 0)

  const startSetting = await prisma.setting.findUnique({ where: { key: 'starting_balance' } })
  const startingBalance = parseFloat(startSetting?.value || '0')

  const allIncomes = await prisma.income.findMany({ where: { month, year } })
  const receivedIncome = allIncomes.reduce((s, i) => s + i.amount, 0)
  const availableCash = startingBalance + receivedIncome - totalExpenses
  const pendingIncome = Math.max(0, totalIncome - receivedIncome)

  return NextResponse.json({
    month, year,
    totalIncome: totalIncome,
    incomeSources: incomeSources.map(s => ({
      name: s.name,
      expected: s.amount,
      actual: s.incomes[0]?.amount || 0
    })),
    totalExpenses,
    expenseCount,
    surplus,
    totalLoanBalance,
    totalLoanPayment,
    financialHealth: totalIncome >= totalExpenses ? 'healthy' : 'warning',
    availableCash,
    startingBalance,
    receivedIncome,
    pendingIncome,
  })
}
