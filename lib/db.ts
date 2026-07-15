import { PrismaClient } from "@prisma/client";

// Prisma singleton — survives dev hot-reload without leaking connections
// (same pattern as the Griffin Opus app).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
