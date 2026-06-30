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

  const expenses = await prisma.expense.findMany({
    where: { isRecurring: true, month: currentMonth, year: currentYear }
  })
  const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const unpaidExpenses = await prisma.expense.findMany({
    where: { month: currentMonth, year: currentYear, status: { in: ['unpaid', 'partial'] } }
  })
  const unpaidTotal = unpaidExpenses.reduce((s, e) => s + e.amount, 0)

  const loans = await prisma.loan.findMany({
    where: { status: 'active' },
    include: { loanPayments: true }
  })

  const loanMonthlyTotal = loans.reduce((s, l) => s + l.monthlyPayment, 0)

  const currentMonthLoanDue = loans.reduce((s, loan) => {
    const alreadyPaidThisMonth = loan.loanPayments.some(
      p => new Date(p.paymentDate).getMonth() + 1 === currentMonth
        && new Date(p.paymentDate).getFullYear() === currentYear
    )
    return alreadyPaidThisMonth ? s : s + loan.monthlyPayment
  }, 0)

  const startingBalance = await prisma.setting.findUnique({ where: { key: 'starting_balance' } })
  let runningBalance = parseInt(startingBalance?.value || '0')

  const projection = []

  for (let i = 0; i < months; i++) {
    let m = currentMonth + i
    let y = currentYear
    if (m > 12) { m -= 12; y += 1 }

    let monthExpenses = loanMonthlyTotal

    if (i === 0) {
      monthExpenses = currentMonthLoanDue + unpaidTotal
    }

    const netCash = monthlyIncome - monthExpenses
    runningBalance += netCash

    projection.push({
      month: m,
      year: y,
      label: `${m}/${y}`,
      income: monthlyIncome,
      expenses: monthExpenses,
      netCash,
      runningBalance
    })
  }

  return NextResponse.json({
    monthlyIncome,
    recurringExpenses: recurringTotal,
    loanPayments: currentMonthLoanDue,
    totalMonthlyOutgoing: currentMonthLoanDue + unpaidTotal,
    currentUnpaid: unpaidTotal,
    startingBalance: parseInt(startingBalance?.value || '0'),
    projection
  })
}
