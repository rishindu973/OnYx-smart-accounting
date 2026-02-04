// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// // 1. Initialize the PostgreSQL connection pool
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);

// const prismaClientSingleton = () => {
//   // 2. FIX: Pass the adapter as the required argument
//   return new PrismaClient({ adapter });
// };

// declare global {
//   var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
// }

// export const db = globalThis.prisma ?? prismaClientSingleton();

// if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// // Initialize the PostgreSQL connection pool
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);

// const prismaClientSingleton = () => {
//   // Pass the adapter as the required argument for Prisma 7/late 6
//   return new PrismaClient({ adapter });
// };

// declare global {
//   var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
// }

// export const db = globalThis.prisma ?? prismaClientSingleton();

// if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);

// const prismaClientSingleton = () => {
//   // Required for Prisma 7/late 6 architecture
//   return new PrismaClient({ adapter });
// };

// declare global {
//   var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
// }

// export const db = globalThis.prisma ?? prismaClientSingleton();

// if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client"; // Standard import after your fix

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  // Required for Prisma 6/7 driver adapter architecture
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;