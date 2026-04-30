"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserBookings = exports.getUserListings = exports.getUserById = exports.getUserStats = exports.getAllUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const cache_1 = require("../config/cache");
const ids_1 = require("../utils/ids");
const isValidRole = (value) => {
    return value === client_1.Role.HOST || value === client_1.Role.GUEST;
};
const sanitizeUser = (user) => {
    const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...safeUser } = user;
    return safeUser;
};
const getAllUsers = async (_req, res, next) => {
    try {
        const users = await prisma_1.default.user.findMany({
            include: {
                _count: {
                    select: {
                        listings: true
                    }
                }
            }
        });
        res.json(users.map((user) => sanitizeUser(user)));
    }
    catch (error) {
        next({ error, operation: "getAllUsers" });
    }
};
exports.getAllUsers = getAllUsers;
const getUserStats = async (_req, res, next) => {
    try {
        const cacheKey = "users:stats";
        const cached = (0, cache_1.getCache)(cacheKey);
        if (cached !== null) {
            res.json(cached);
            return;
        }
        const [totalUsers, byRole] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.user.groupBy({
                by: ["role"],
                _count: true
            })
        ]);
        const stats = {
            totalUsers,
            byRole: byRole.map((entry) => ({
                role: entry.role,
                count: entry._count
            }))
        };
        (0, cache_1.setCache)(cacheKey, stats, 300);
        res.json(stats);
    }
    catch (error) {
        next({ error, operation: "getUserStats" });
    }
};
exports.getUserStats = getUserStats;
const getUserById = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            include: {
                listings: true,
                bookings: {
                    include: {
                        listing: true
                    }
                }
            }
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(sanitizeUser(user));
    }
    catch (error) {
        next({ error, operation: "getUserById" });
    }
};
exports.getUserById = getUserById;
const getUserListings = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const user = await prisma_1.default.user.findFirst({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const listings = await prisma_1.default.listing.findMany({ where: { hostId: id } });
        res.json(listings);
    }
    catch (error) {
        next({ error, operation: "getUserListings" });
    }
};
exports.getUserListings = getUserListings;
const getUserBookings = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const user = await prisma_1.default.user.findFirst({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const bookings = await prisma_1.default.booking.findMany({
            where: { guestId: id },
            include: {
                listing: true
            }
        });
        res.json(bookings);
    }
    catch (error) {
        next({ error, operation: "getUserBookings" });
    }
};
exports.getUserBookings = getUserBookings;
const createUser = async (req, res, next) => {
    try {
        const { name, email, username, phone, password, role, avatar, bio } = req.body;
        if (!name || !email || !username || !phone || !password) {
            res.status(400).json({ message: "Missing required fields: name, email, username, phone, password" });
            return;
        }
        if (role !== undefined && !isValidRole(role)) {
            res.status(400).json({ message: "Role must be HOST or GUEST" });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ message: "Password must be at least 8 characters" });
            return;
        }
        const duplicateEmail = await prisma_1.default.user.findFirst({ where: { email } });
        if (duplicateEmail) {
            res.status(409).json({ message: "Email already exists" });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                username,
                phone,
                password: hashedPassword,
                role,
                avatar,
                bio
            }
        });
        (0, cache_1.invalidateCache)("users:stats");
        res.status(201).json(sanitizeUser(user));
    }
    catch (error) {
        next({ error, operation: "createUser" });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const { name, email, username, phone, password, role, avatar, bio } = req.body;
        if (role !== undefined && !isValidRole(role)) {
            res.status(400).json({ message: "Role must be HOST or GUEST" });
            return;
        }
        const passwordUpdate = password ? { password: await bcrypt_1.default.hash(password, 10) } : {};
        const existing = await prisma_1.default.user.findFirst({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: {
                name,
                email,
                username,
                phone,
                ...passwordUpdate,
                role,
                avatar,
                bio
            }
        });
        (0, cache_1.invalidateCache)("users:stats");
        res.json(sanitizeUser(user));
    }
    catch (error) {
        next({ error, operation: "updateUser" });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const existing = await prisma_1.default.user.findFirst({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const deleted = await prisma_1.default.user.delete({ where: { id } });
        (0, cache_1.invalidateCache)("users:stats");
        res.json(deleted);
    }
    catch (error) {
        next({ error, operation: "deleteUser" });
    }
};
exports.deleteUser = deleteUser;
