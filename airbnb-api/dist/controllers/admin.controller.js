"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyStats = exports.deleteUser = exports.setUserStatus = exports.getBookings = exports.getListings = exports.getUsers = exports.getOverview = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const ids_1 = require("../utils/ids");
const sanitizeUser = (user) => {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpiry;
    return safeUser;
};
const getOverview = async (_req, res, next) => {
    try {
        const [totalUsers, activeUsers, disabledUsers, totalHosts, totalGuests, totalListings, totalBookings, pendingBookings, confirmedBookings, cancelledBookings, revenue, recentUsers, recentListings, recentBookings] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.user.count({ where: { isActive: true } }),
            prisma_1.default.user.count({ where: { isActive: false } }),
            prisma_1.default.user.count({ where: { role: client_1.Role.HOST } }),
            prisma_1.default.user.count({ where: { role: client_1.Role.GUEST } }),
            prisma_1.default.listing.count(),
            prisma_1.default.booking.count(),
            prisma_1.default.booking.count({ where: { status: client_1.BookingStatus.PENDING } }),
            prisma_1.default.booking.count({ where: { status: client_1.BookingStatus.CONFIRMED } }),
            prisma_1.default.booking.count({ where: { status: client_1.BookingStatus.CANCELLED } }),
            prisma_1.default.booking.aggregate({
                _sum: { totalPrice: true },
                where: { status: client_1.BookingStatus.CONFIRMED }
            }),
            prisma_1.default.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    _count: {
                        select: { listings: true, bookings: true }
                    }
                }
            }),
            prisma_1.default.listing.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    host: {
                        select: { id: true, name: true, email: true, role: true, isActive: true }
                    },
                    _count: {
                        select: { bookings: true }
                    }
                }
            }),
            prisma_1.default.booking.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    guest: {
                        select: { id: true, name: true, email: true }
                    },
                    listing: {
                        select: { id: true, title: true, location: true, pricePerNight: true, hostId: true }
                    }
                }
            })
        ]);
        res.json({
            summary: {
                totalUsers,
                activeUsers,
                disabledUsers,
                totalHosts,
                totalGuests,
                totalListings,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                cancelledBookings,
                totalRevenue: revenue._sum.totalPrice ?? 0
            },
            recentUsers: recentUsers.map((user) => sanitizeUser(user)),
            recentListings,
            recentBookings
        });
    }
    catch (error) {
        next({ error, operation: "getOverview" });
    }
};
exports.getOverview = getOverview;
const getUsers = async (_req, res, next) => {
    try {
        const users = await prisma_1.default.user.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { listings: true, bookings: true, reviews: true }
                }
            }
        });
        res.json(users.map((user) => sanitizeUser(user)));
    }
    catch (error) {
        next({ error, operation: "getUsers" });
    }
};
exports.getUsers = getUsers;
const getListings = async (_req, res, next) => {
    try {
        const listings = await prisma_1.default.listing.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                host: {
                    select: { id: true, name: true, email: true, role: true, isActive: true }
                },
                _count: {
                    select: { bookings: true, reviews: true }
                },
                photos: {
                    select: { id: true, url: true, publicId: true }
                }
            }
        });
        res.json(listings);
    }
    catch (error) {
        next({ error, operation: "getListings" });
    }
};
exports.getListings = getListings;
const getBookings = async (_req, res, next) => {
    try {
        const bookings = await prisma_1.default.booking.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                guest: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                listing: {
                    include: {
                        host: {
                            select: { id: true, name: true, email: true }
                        },
                        photos: {
                            select: { id: true, url: true, publicId: true }
                        }
                    }
                }
            }
        });
        res.json(bookings);
    }
    catch (error) {
        next({ error, operation: "getBookings" });
    }
};
exports.getBookings = getBookings;
const setUserStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const isActive = Boolean(req.body?.isActive);
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const updated = await prisma_1.default.user.update({
            where: { id },
            data: { isActive }
        });
        res.json(sanitizeUser(updated));
    }
    catch (error) {
        next({ error, operation: "setUserStatus" });
    }
};
exports.setUserStatus = setUserStatus;
const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        await prisma_1.default.user.delete({ where: { id } });
        res.json({ message: "User deleted" });
    }
    catch (error) {
        next({ error, operation: "deleteUser" });
    }
};
exports.deleteUser = deleteUser;
const getMonthlyStats = async (req, res, next) => {
    try {
        // Get year from query parameter, default to current year
        const yearParam = req.query.year || String(new Date().getFullYear());
        const selectedYear = parseInt(yearParam, 10);
        if (isNaN(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
            res.status(400).json({ message: "Invalid year parameter" });
            return;
        }
        // Get all 12 months for the selected year
        const months = [];
        for (let i = 0; i < 12; i++) {
            const date = new Date(selectedYear, i, 1);
            const monthStr = date.toLocaleString("en-US", { month: "short" });
            months.push({ month: monthStr, date });
        }
        const monthlyData = await Promise.all(months.map(async ({ month, date }) => {
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            const [usersCreated, listingsCreated, bookingsCreated] = await Promise.all([
                prisma_1.default.user.count({
                    where: {
                        createdAt: { gte: date, lt: nextMonth }
                    }
                }),
                prisma_1.default.listing.count({
                    where: {
                        createdAt: { gte: date, lt: nextMonth }
                    }
                }),
                prisma_1.default.booking.count({
                    where: {
                        createdAt: { gte: date, lt: nextMonth }
                    }
                })
            ]);
            return {
                month,
                users: usersCreated,
                listings: listingsCreated,
                bookings: bookingsCreated
            };
        }));
        res.json(monthlyData);
    }
    catch (error) {
        next({ error, operation: "getMonthlyStats" });
    }
};
exports.getMonthlyStats = getMonthlyStats;
