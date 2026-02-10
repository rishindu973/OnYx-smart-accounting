import Fuse from "fuse.js";
import { prisma } from "@/lib/prisma"; // Correct: Import the instance, not the type

// Define the shape of your vendor data for TypeScript
interface VendorMapping {
    id: string;
    companyId: string;
    vendorName: string;
    defaultDebitAccountId: string;
    defaultCreditAccountId: string;
}

export async function findNormalizationVendorMatch(ocrName: string) {
    if (!ocrName || ocrName === "Review Required") return { isNew: true, accountId: null };

    try {
        // Use the 'prisma' instance (lowercase p) to query the DB
        const knownVendors = await prisma.vendorMapping.findMany() as unknown as VendorMapping[];
        
        const fuse = new Fuse<VendorMapping>(knownVendors, {
            keys: ['vendor_name'],
            threshold: 0.4,
        });

        const result = fuse.search(ocrName);

        if (result.length > 0) {
            return {
                isNew: false,
                accountId: result[0].item.defaultDebitAccountId,
                matchedName: result[0].item.vendorName
            };
        }
    } catch (error) {
        console.error("Normalization Error:", error);
    }
    
    return { isNew: true, accountId: null };
}