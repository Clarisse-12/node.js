import "dotenv/config";
import type { PrismaConfig } from "prisma";

const config: PrismaConfig = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? ""
  }
};

export default config;