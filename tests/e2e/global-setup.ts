import { PrismaClient } from "@prisma/client";

/** Rate-limit counters live in the database; start every run with a clean slate. */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    await prisma.rateLimit.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}
