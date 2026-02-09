import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create a default company for Onyx project
  const company = await prisma.company.upsert({
    where: { id: 'clx-onyx-001' }, // Use a fixed ID for testing
    update: {},
    create: {
      id: 'clx-onyx-001',
      name: 'Onyx Smart Accounting Demo',
      fiscalYearStart: new Date('2026-01-01'),
      dailyLimitBase: 50000,
    },
  })

  console.log({ company })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })