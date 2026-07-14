import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const mother = await prisma.person.create({
    data: { name: 'မေမေ', nickname: 'Mother', relation: 'Mother' }
  })
  const brother = await prisma.person.create({
    data: { name: 'အကို', nickname: 'Brother', relation: 'Brother' }
  })
  const mali = await prisma.person.create({
    data: { name: 'မလီ', nickname: 'Mali', relation: 'Family' }
  })
  const zan = await prisma.person.create({
    data: { name: 'Zan', relation: 'Friend' }
  })
  const kogyi = await prisma.person.create({
    data: { name: 'Ko Gyi', relation: 'Friend' }
  })

  await prisma.incomeSource.create({
    data: { name: 'လစာ (Salary)', amount: 0, type: 'salary' }
  })

  const expenses = [
    { name: 'မေမေ (Mother)',           amount: 300000,  status: 'unpaid',  category: 'Family',    personId: mother.id },
    { name: 'ဈေးခြောက် (Groceries)',   amount: 300000,  status: 'unpaid',  category: 'Groceries' },
    { name: 'Home Loan',               amount: 1510000, status: 'paid',    category: 'Housing',   dueDay: 28 },
    { name: 'ဆန် (Rice)',              amount: 200000,  status: 'unpaid',  category: 'Groceries' },
    { name: 'ဆီ (Oil)',                amount: 50000,   status: 'paid',    category: 'Groceries' },
    { name: 'Diaper',                  amount: 30000,   status: 'paid',    category: 'Baby' },
    { name: 'Mg',                      amount: 200000,  status: 'paid',    category: 'Family' },
    { name: 'Chit',                    amount: 150000,  status: 'paid',    category: 'Family' },
    { name: 'ဟေသသာ',                  amount: 150000,  status: 'partial', category: 'Other',   paidAmount: 23000 },
    { name: 'Cos (Cosmetics)',         amount: 100000,  status: 'paid',    category: 'Personal' },
    { name: 'Other',                   amount: 100000,  status: 'paid',    category: 'Other' },
    { name: 'မီတာ (Electricity)',      amount: 100000,  status: 'unpaid',  category: 'Utilities' },
    { name: 'ရေဖိုး (Water)',          amount: 15000,   status: 'unpaid',  category: 'Utilities' },
    { name: 'ဆိုင်ခန်း (Shop Rent)',   amount: 40000,   status: 'paid',    category: 'Housing' },
    { name: 'အသင်းကြေး (Association)', amount: 290500,  status: 'unpaid',  category: 'Other',
      notes: '242,000 + 48,500', personId: zan.id },
    { name: 'Zan',                     amount: 65000,   status: 'paid',    category: 'Family',   personId: brother.id },
    { name: 'Ko Gyi',                  amount: 130000,  status: 'unpaid',  category: 'Family',   personId: kogyi.id },
    { name: 'အကို (Elder Brother)',    amount: 300000,  status: 'paid',    category: 'Family',   personId: brother.id },
    { name: 'မလီ',                     amount: 38000,   status: 'paid',    category: 'Family',   personId: mali.id },
    { name: 'Hotpot',                  amount: 100000,  status: 'paid',    category: 'Food' },
    { name: 'Mg Bill',                 amount: 10000,   status: 'paid',    category: 'Bills' },
    { name: 'Chit Bill',               amount: 2000,    status: 'paid',    category: 'Bills' },
    { name: 'ဟင်းသီး (Vegetables)',    amount: 7500,    status: 'paid',    category: 'Food' },
    { name: 'ပဲပြုတ် (Boiled Beans)',  amount: 2000,    status: 'paid',    category: 'Food' },
    { name: 'Tea (1st)',               amount: 12600,   status: 'paid',    category: 'Food' },
    { name: 'Tea (2nd)',               amount: 10600,   status: 'paid',    category: 'Food' },
    { name: 'အအေးရေ (Cold Drinks)',   amount: 3500,    status: 'paid',    category: 'Food' },
  ]

  for (const exp of expenses) {
    const { personId, ...data } = exp
    await prisma.expense.create({
      data: {
        ...data,
        month: 6,
        year: 2026,
        isRecurring: data.category !== 'Food',
        personId: personId || null,
      }
    })
  }

  const startDate = new Date('2026-02-28')
  const principal = 109399500
  const annualRate = 13
  const monthlyPayment = 1510000
  const termMonths = 144

  const monthlyRate = annualRate / 100 / 12

  let balance = principal
  const payments = []
  const paymentDates = [
    new Date('2026-02-28'),
    new Date('2026-03-28'),
    new Date('2026-04-28'),
    new Date('2026-05-28'),
    new Date('2026-06-28'),
  ]

  for (let i = 0; i < 5; i++) {
    const interest = balance * monthlyRate
    const principalPart = monthlyPayment - interest
    balance -= principalPart
    if (balance < 0) balance = 0
    payments.push({
      amount: monthlyPayment,
      principalPart: Math.round(principalPart),
      interestPart: Math.round(interest),
      remainingAfter: Math.round(balance),
      paymentDate: paymentDates[i],
    })
  }

  const totalPaidSoFar = 5 * monthlyPayment

  const loan = await prisma.loan.create({
    data: {
      name: 'Home Loan',
      lender: 'Bank',
      principal,
      balance: Math.round(balance),
      interestRate: annualRate,
      monthlyPayment,
      termMonths,
      startDate,
      totalPaid: totalPaidSoFar,
      status: 'active',
    }
  })

  for (const p of payments) {
    await prisma.loanPayment.create({
      data: {
        loanId: loan.id,
        amount: p.amount,
        principalPart: p.principalPart,
        interestPart: p.interestPart,
        remainingAfter: p.remainingAfter,
        paymentDate: p.paymentDate,
      }
    })
  }

  await prisma.setting.create({ data: { key: 'currency', value: 'MMK' } })

  console.log('Seed data inserted successfully')
  console.log(`Home Loan balance: ${Math.round(balance).toLocaleString()} (5 payments made)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
