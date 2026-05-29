import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis;

export function getPrisma() {
  if (!globalForPrisma.__setNivelacionPrisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta configurar DATABASE_URL para conectar la plataforma a PostgreSQL.");
    }

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    globalForPrisma.__setNivelacionPrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.__setNivelacionPrisma;
}
