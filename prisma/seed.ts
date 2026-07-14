import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

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
  console.log('Seed complete — empty database ready')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
