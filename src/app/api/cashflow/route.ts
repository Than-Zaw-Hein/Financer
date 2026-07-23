import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get('months') || '12')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const incomeSources = await prisma.incomeSource.findMany()
  const monthlyIncome = incomeSources.reduce((s, src) => s + src.amount, 0)

  const currentTxns = await prisma.transaction.findMany({
    where: { month: currentMonth, year: currentYear, type: 'EXPENSE' }
  })
  const monthExpenseTotal = currentTxns.reduce((s, t) => s + t.amount, 0)

  const loans = await prisma.loan.findMany({
    where: { status: 'active' },
    include: { loanPayments: true }
  })

  const loanMonthlyTotal = loans.reduce((s, l) => s + l.monthlyPayment, 0)

  const currentMonthLoanDue = loans.reduce((s, loan) => {
    const alreadyPaid = loan.loanPayments.some(
      p => new Date(p.paymentDate).getMonth() + 1 === currentMonth
        && new Date(p.paymentDate).getFullYear() === currentYear
    )
    return alreadyPaid ? s : s + loan.monthlyPayment
  }, 0)

  const startSetting = await prisma.setting.findUnique({ where: { key: 'starting_balance' } })
  let runningBalance = parseInt(startSetting?.value || '0')

  const projection = []

  for (let i = 0; i < months; i++) {
    let m = currentMonth + i
    let y = currentYear
    if (m > 12) { m -= 12; y += 1 }

    const monthExpenses = i === 0 ? currentMonthLoanDue + monthExpenseTotal : loanMonthlyTotal
    const netCash = monthlyIncome - monthExpenses
    runningBalance += netCash

    projection.push({
      month: m, year: y,
      label: `${m}/${y}`,
      income: monthlyIncome,
      expenses: monthExpenses,
      netCash,
      runningBalance
    })
  }

  return NextResponse.json({
    monthlyIncome,
    totalExpensesThisMonth: monthExpenseTotal,
    loanPaymentsDue: currentMonthLoanDue,
    totalMonthlyOutgoing: currentMonthLoanDue + monthExpenseTotal,
    startingBalance: parseInt(startSetting?.value || '0'),
    projection
  })
}
