"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}
const adapter = new adapter_pg_1.PrismaPg({ connectionString: databaseUrl });
const prisma = new client_1.PrismaClient({ adapter });
const addDays = (days) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};
const nightsBetween = (checkIn, checkOut) => {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.round((checkOut.getTime() - checkIn.getTime()) / millisecondsPerDay);
};
async function main() {
    console.log("🌱 Seeding...");
    await prisma.booking.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.user.deleteMany();
    const hashedPassword = await bcrypt_1.default.hash("password123", 10);
    const alice = await prisma.user.upsert({
        where: { email: "alice@example.com" },
        update: {},
        create: {
            name: "Alice Johnson",
            email: "alice@example.com",
            username: "alice_host",
            phone: "+1-212-555-0101",
            password: hashedPassword,
            role: client_1.Role.HOST
        }
    });
    const ben = await prisma.user.upsert({
        where: { email: "ben@example.com" },
        update: {},
        create: {
            name: "Ben Carter",
            email: "ben@example.com",
            username: "ben_host",
            phone: "+1-212-555-0102",
            password: hashedPassword,
            role: client_1.Role.HOST
        }
    });
    const bob = await prisma.user.upsert({
        where: { email: "bob@example.com" },
        update: {},
        create: {
            name: "Bob Smith",
            email: "bob@example.com",
            username: "bob_guest",
            phone: "+1-212-555-0103",
            password: hashedPassword,
            role: client_1.Role.GUEST
        }
    });
    const carol = await prisma.user.upsert({
        where: { email: "carol@example.com" },
        update: {},
        create: {
            name: "Carol White",
            email: "carol@example.com",
            username: "carol_guest",
            phone: "+1-212-555-0104",
            password: hashedPassword,
            role: client_1.Role.GUEST
        }
    });
    const kevin = await prisma.user.upsert({
        where: { email: "kevin@example.com" },
        update: {},
        create: {
            name: "Kevin Lee",
            email: "kevin@example.com",
            username: "kevin_guest",
            phone: "+1-212-555-0105",
            password: hashedPassword,
            role: client_1.Role.GUEST
        }
    });
    console.log("👥 Created users");
    const apartment = await prisma.listing.create({
        data: {
            title: "Cozy apartment in downtown",
            description: "A bright apartment in the heart of the city.",
            location: "New York, NY",
            pricePerNight: 120,
            guests: 2,
            type: client_1.ListingType.APARTMENT,
            amenities: ["WiFi", "Kitchen", "Air conditioning"],
            hostId: alice.id
        }
    });
    const house = await prisma.listing.create({
        data: {
            title: "Beach house with ocean view",
            description: "Wake up to sweeping ocean views every morning.",
            location: "Miami, FL",
            pricePerNight: 250,
            guests: 6,
            type: client_1.ListingType.HOUSE,
            amenities: ["WiFi", "Pool", "Beach access", "BBQ"],
            hostId: alice.id
        }
    });
    const villa = await prisma.listing.create({
        data: {
            title: "Sunset villa with private terrace",
            description: "A spacious villa with sunset views and a private terrace.",
            location: "Los Angeles, CA",
            pricePerNight: 310,
            guests: 8,
            type: client_1.ListingType.VILLA,
            amenities: ["WiFi", "Terrace", "Jacuzzi", "Parking"],
            hostId: ben.id
        }
    });
    const cabin = await prisma.listing.create({
        data: {
            title: "Mountain cabin retreat",
            description: "A peaceful cabin escape surrounded by pine trees.",
            location: "Denver, CO",
            pricePerNight: 180,
            guests: 4,
            type: client_1.ListingType.CABIN,
            amenities: ["Fireplace", "Hiking trails", "WiFi"],
            hostId: ben.id
        }
    });
    console.log("🏠 Created listings");
    const booking1CheckIn = addDays(14);
    const booking1CheckOut = addDays(18);
    const booking2CheckIn = addDays(20);
    const booking2CheckOut = addDays(25);
    const booking3CheckIn = addDays(30);
    const booking3CheckOut = addDays(34);
    await prisma.booking.create({
        data: {
            checkIn: booking1CheckIn,
            checkOut: booking1CheckOut,
            totalPrice: nightsBetween(booking1CheckIn, booking1CheckOut) * apartment.pricePerNight,
            status: client_1.BookingStatus.CONFIRMED,
            guestId: bob.id,
            listingId: apartment.id
        }
    });
    await prisma.booking.create({
        data: {
            checkIn: booking2CheckIn,
            checkOut: booking2CheckOut,
            totalPrice: nightsBetween(booking2CheckIn, booking2CheckOut) * house.pricePerNight,
            status: client_1.BookingStatus.PENDING,
            guestId: carol.id,
            listingId: house.id
        }
    });
    await prisma.booking.create({
        data: {
            checkIn: booking3CheckIn,
            checkOut: booking3CheckOut,
            totalPrice: nightsBetween(booking3CheckIn, booking3CheckOut) * villa.pricePerNight,
            status: client_1.BookingStatus.CONFIRMED,
            guestId: kevin.id,
            listingId: villa.id
        }
    });
    console.log("📅 Created bookings");
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
