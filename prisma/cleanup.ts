import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.transaction.updateMany({ where: { isDeleted: true }, data: { isDeleted: false } })
  await prisma.transaction.deleteMany({ where: { isDeleted: false } })
  await prisma.income.deleteMany()
  await prisma.incomeSource.deleteMany()
  await prisma.setting.deleteMany()
  console.log('Cleared all data. Loan data preserved.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
