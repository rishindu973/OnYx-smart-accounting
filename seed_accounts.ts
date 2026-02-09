import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const companyId = 'clx-onyx-001'

    // Ensure company exists (it should, based on previous check, but good to be safe)
    const company = await prisma.company.upsert({
        where: { id: companyId },
        update: {},
        create: {
            id: companyId,
            name: 'Onyx Smart Accounting Demo',
            fiscalYearStart: new Date('2026-01-01'),
            dailyLimitBase: 50000,
        },
    })

    const accounts = [
        { name: 'Checking', type: AccountType.ASSET, code: '1000' },
        { name: 'Accounts Receivable', type: AccountType.ASSET, code: '1100' },
        { name: 'Accounts Payable', type: AccountType.LIABILITY, code: '2000' },
        { name: 'Sales', type: AccountType.REVENUE, code: '4000' },
        { name: 'Office Expense', type: AccountType.EXPENSE, code: '6000' },
        { name: 'Undeposited Funds', type: AccountType.ASSET, code: '1010' },
    ]

    console.log(`Seeding accounts for company: ${company.name}`)

    for (const acc of accounts) {
        await prisma.chartOfAccounts.upsert({
            where: {
                companyId_code: {
                    companyId: companyId,
                    code: acc.code,
                },
            },
            update: {},
            create: {
                companyId: companyId,
                name: acc.name,
                type: acc.type,
                code: acc.code,
                currentBalance: 0,
            },
        })
        console.log(` - Upserted account: ${acc.name} (${acc.code})`)
    }
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
