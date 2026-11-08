import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process. Next.js hot-reloads modules in development,
 * which would otherwise open a new connection pool on every save until
 * Postgres refuses them.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
