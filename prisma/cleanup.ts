import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.payment.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.personBalance.deleteMany()
  await prisma.income.deleteMany()
  await prisma.incomeSource.deleteMany()
  await prisma.person.deleteMany()
  await prisma.setting.deleteMany()
  console.log('Cleared all data. Loan data preserved.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
