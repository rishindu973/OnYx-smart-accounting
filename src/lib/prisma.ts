import { PrismaClient } from "@prisma/client";

// ✅ Singleton pattern to prevent "Too many clients" errors
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ["error", "warn"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;