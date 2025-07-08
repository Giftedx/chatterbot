import { PrismaClient } from '@prisma/client';

// Create a single PrismaClient instance across the app to avoid exhausting DB connections.
// In a normal serverless environment you would guard with `globalThis`. For this long-running
// Discord bot process, a simple singleton is sufficient.

export const prisma = new PrismaClient();
