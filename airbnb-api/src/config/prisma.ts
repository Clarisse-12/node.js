import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function connectDB() {
  await prisma.$connect();
  console.log("Database connected successfully");
}

export default prisma;