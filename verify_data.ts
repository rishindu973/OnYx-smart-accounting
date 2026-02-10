import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const company = await prisma.company.findFirst()
    console.log('Company:', company)

    if (company) {
        const accounts = await prisma.chartOfAccounts.findMany({
            where: { companyId: company.id }
        })
        console.log('Accounts count:', accounts.length)
        if (accounts.length > 0) {
            console.log('First account:', accounts[0])
        } else {
            console.log('No accounts found.')
        }

        const ledgerLines = await prisma.ledgerLine.findMany({
            take: 5
        })
        console.log('Ledger Lines count:', ledgerLines.length)
    } else {
        console.log('No company found.')
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
