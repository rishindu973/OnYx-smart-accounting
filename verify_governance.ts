
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Governance Calendar API Logic...')

    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.log("No company found, skipping test");
            return;
        }

        const companyId = company.id;
        const month = "2026-02"; // Current context month

        // Simulate the API logic
        const [year, m] = month.split("-").map(Number);
        const startOfMonth = new Date(year, m - 1, 1);
        const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);

        console.log(`Checking limits for Company: ${companyId}, Month: ${month}`);

        const customLimits = await prisma.dailyLimit.findMany({
            where: {
                companyId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });
        console.log(`Found ${customLimits.length} custom limits`);

        const extractions = await prisma.extractedInformation.findMany({
            where: {
                document: {
                    companyId,
                    status: "PROCESSED",
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            },
        });
        console.log(`Found ${extractions.length} processed extractions for spending calculation`);

    } catch (error) {
        console.error('Error executing verification:', error)
        process.exit(1)
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
