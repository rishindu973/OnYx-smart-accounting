
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Document query with createdAt...')

    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const count = await prisma.document.count({
            where: {
                createdAt: {
                    gte: todayStart,
                    lte: todayEnd
                }
            }
        })
        console.log(`Success! Document count for today: ${count}`)
    } catch (error) {
        console.error('Error executing query with createdAt:', error)
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
