import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding...");

  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@airbnb.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@airbnb.local",
      username: "airbnb_admin",
      phone: "+1-212-555-0100",
      password: hashedPassword,
      role: "ADMIN" as Role,
      isActive: true
    }
  });

  console.log(`👤 Created admin user: ${admin.email}`);
  console.log("✅ Seeding complete!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
