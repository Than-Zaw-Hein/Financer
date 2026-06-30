import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  await p.setting.upsert({
    where: { key: 'starting_balance' },
    update: { value: '4000000' },
    create: { key: 'starting_balance', value: '4000000' }
  })
  console.log('starting_balance = 4000000')
}
main().finally(() => p.$disconnect())
