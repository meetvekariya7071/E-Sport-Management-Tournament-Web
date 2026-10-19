import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('[Database] Successfully connected to database via Prisma ORM.');
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('[Database] Disconnected from database.');
};
