import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const EXTRA_UUID = '00000000-0000-0000-0000-000000000001'
const INCOME_UUID = '00000000-0000-0000-0000-000000000002'

async function main() {
  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: {},
    create: { key: 'currency', value: 'MMK' },
  })
  await prisma.setting.upsert({
    where: { key: 'starting_balance' },
    update: {},
    create: { key: 'starting_balance', value: '0' },
  })
  await prisma.category.upsert({
    where: { name: 'Extra' },
    update: { uuid: EXTRA_UUID },
    create: { name: 'Extra', icon: '✨', color: '#F0C000', uuid: EXTRA_UUID },
  })
  await prisma.category.upsert({
    where: { name: 'Income' },
    update: { uuid: INCOME_UUID },
    create: { name: 'Income', icon: '💰', color: '#4CAF50', uuid: INCOME_UUID },
  })
  console.log('Seed complete — empty database ready')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
