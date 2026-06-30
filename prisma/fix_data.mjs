import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("=== Step 1: Fix People Names ===")
  
  // Fix person names
  await prisma.person.update({ where: { id: "cmr09aald0004h9pkqsm09agd" }, data: { name: "မေမေ", nickname: "Mother", relation: "Mother" } })
  await prisma.person.update({ where: { id: "cmr09aamd0005h9pkflk8fi11" }, data: { name: "အကို", nickname: "Brother", relation: "Brother" } })
  await prisma.person.update({ where: { id: "cmr09aan30006h9pkx3m542b4" }, data: { name: "မလီ", nickname: "Mali", relation: "Family" } })
  await prisma.person.update({ where: { id: "cmr09aans0007h9pk7uei6ybi" }, data: { name: "Zan", nickname: null, relation: "Friend" } })
  await prisma.person.update({ where: { id: "cmr09aaog0008h9pkb7tje607" }, data: { name: "Ko Gyi", nickname: null, relation: "Friend" } })
  console.log("✅ People names fixed")

  // Get people
  const people = await prisma.person.findMany()
  for (const p of people) {
    console.log(`  ${p.name} (${p.relation}) -> ${p.id}`)
  }

  // Map IDs
  const mother = people.find(p => p.name === "မေမေ")
  const brother = people.find(p => p.name === "အကို")
  const mali = people.find(p => p.name === "မလီ")
  const zan = people.find(p => p.name === "Zan")
  const kogyi = people.find(p => p.name === "Ko Gyi")

  console.log("\n=== Step 2: Clear old expenses ===")
  await prisma.expense.deleteMany()
  console.log("✅ Old expenses deleted")

  console.log("\n=== Step 3: Import Expenses ===")
  
  const expenses = [
    { name: "မေမေ (Mother)",            amount: 300000,  category: "Family",    status: "unpaid",  personId: mother.id },
    { name: "ေစ်က်ဖော် (Groceries)",     amount: 300000,  category: "Groceries", status: "unpaid" },
    { name: "Home Loan",                 amount: 1510000, category: "Housing",   status: "paid" },
    { name: "ဆန် (Rice)",                amount: 200000,  category: "Groceries", status: "unpaid" },
    { name: "ဆီ (Oil)",                  amount: 50000,   category: "Groceries", status: "paid" },
    { name: "Diaper",                    amount: 30000,   category: "Baby",      status: "paid" },
    { name: "Mg",                        amount: 200000,  category: "Family",    status: "paid" },
    { name: "Chit",                      amount: 150000,  category: "Family",    status: "paid" },
    { name: "ဟေသသာ",                    amount: 150000,  category: "Other",     status: "partial", paidAmount: 23000, notes: "Only 23k paid" },
    { name: "Cos (Cosmetics)",           amount: 100000,  category: "Personal",  status: "paid" },
    { name: "Other",                     amount: 100000,  category: "Other",     status: "paid" },
    { name: "မီတာ (Electricity)",         amount: 100000,  category: "Utilities", status: "unpaid" },
    { name: "ရေဖာ်း (Water)",            amount: 15000,   category: "Utilities", status: "unpaid" },
    { name: "ဆိုင်ခန် (Shop Rent)",       amount: 40000,   category: "Housing",   status: "paid" },
    { name: "အသင်းကြေး (Association)",    amount: 290500,  category: "Other",     status: "unpaid", notes: "242,000 + 48,500", personId: zan.id },
    { name: "Zan",                       amount: 65000,   category: "Family",    status: "paid",    personId: brother.id },
    { name: "Ko Gyi",                    amount: 130000,  category: "Family",    status: "unpaid",  personId: kogyi.id },
    { name: "အကို (Elder Brother)",      amount: 300000,  category: "Family",    status: "paid",    personId: brother.id },
    { name: "မလီ",                       amount: 38000,   category: "Family",    status: "paid",    personId: mali.id },
    { name: "Hotpot",                    amount: 100000,  category: "Food",      status: "paid",    isRecurring: false },
    { name: "Mg Bill",                   amount: 10000,   category: "Bills",     status: "paid",    isRecurring: false },
    { name: "Chit Bill",                 amount: 2000,    category: "Bills",     status: "paid",    isRecurring: false },
    { name: "ဟင်းသီး (Vegetables)",       amount: 7500,    category: "Food",      status: "paid",    isRecurring: false },
    { name: "ပဲပြိုး (Boiled Beans)",     amount: 2000,    category: "Food",      status: "paid",    isRecurring: false },
    { name: "Tea (1st)",                 amount: 12600,   category: "Food",      status: "paid",    isRecurring: false },
    { name: "Tea (2nd)",                 amount: 10600,   category: "Food",      status: "paid",    isRecurring: false },
    { name: "အအေးရေ (Cold Drinks)",      amount: 3500,    category: "Food",      status: "paid",    isRecurring: false },
    { name: "ကြက်သား (Chicken)",         amount: 5000,    category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "ပန်းလှူ (Offering Flowers)", amount: 2500,    category: "Other",     status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "သီးတောင် (3 Fruits)",       amount: 13000,   category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "ကြက်သွန်+ခရမ်း+ပန်းသီး",     amount: 7600,    category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "မှို+ပန်းမုံလာ",              amount: 3500,    category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "နို့ (Milk)",                amount: 3200,    category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
    { name: "Tea",                       amount: 6600,    category: "Food",      status: "paid",    isRecurring: false, notes: "29 Jun" },
  ]

  for (const exp of expenses) {
    const { personId, ...data } = exp
    await prisma.expense.create({
      data: {
        ...data,
        month: 6,
        year: 2026,
        personId: personId || null,
      }
    })
  }

  console.log(`✅ ${expenses.length} expenses imported`)

  // Verify
  const count = await prisma.expense.count()
  const total = await prisma.expense.aggregate({ _sum: { amount: true } })
  const problems = await prisma.expense.findMany({ where: { name: { contains: "?" } } })
  
  console.log(`\n=== Verification ===`)
  console.log(`Total expenses: ${count}`)
  console.log(`Total amount: MMK ${total._sum.amount?.toLocaleString()}`)
  console.log(`Names with '?': ${problems.length}`)

  const people2 = await prisma.person.findMany()
  console.log(`\nPeople:`)
  for (const p of people2) {
    const hasQ = p.name.includes("?")
    console.log(`  ${hasQ ? "❌" : "✅"} ${p.name}`)
  }

  const names = await prisma.expense.findMany({ select: { name: true, amount: true, status: true }, orderBy: { createdAt: "asc" } })
  for (const n of names) {
    const hasQ = n.name.includes("?")
    console.log(`  ${hasQ ? "❌" : "✅"} ${n.name} | MMK ${n.amount.toLocaleString()} | ${n.status}`)
  }

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
