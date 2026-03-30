import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const extracted = await prisma.extractedInformation.findFirst()
    if (extracted) {
        console.log('Extracted Data Sample:')
        console.log(JSON.stringify(extracted.extractedData, null, 2))
    } else {
        console.log('No extracted information found.')
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
