"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHostRequest = exports.listHostRequests = exports.requestHost = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserBookings = exports.getUserListings = exports.getUserById = exports.getUserStats = exports.getAllUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const cache_1 = require("../config/cache");
const ids_1 = require("../utils/ids");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const isValidRole = (value) => {
    return value === client_1.Role.HOST || value === client_1.Role.GUEST;
};
const sanitizeUser = (user) => {
    const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...safeUser } = user;
    return safeUser;
};
const canAccessUserResource = (requestUserId, requestRole, targetUserId) => {
    return requestRole === "ADMIN" || requestUserId === targetUserId;
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
        const authReq = req;
        if (!canAccessUserResource(authReq.userId, authReq.role, id)) {
            res.status(403).json({ message: "Forbidden" });
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
        const authReq = req;
        if (!canAccessUserResource(authReq.userId, authReq.role, id)) {
            res.status(403).json({ message: "You can only view your own listings" });
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
        const authReq = req;
        if (!canAccessUserResource(authReq.userId, authReq.role, id)) {
            res.status(403).json({ message: "Forbidden" });
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
        // Authorization: only admins or the user themselves can update
        const authReq = req;
        const requesterId = authReq.userId;
        const requesterRole = authReq.role;
        if (!canAccessUserResource(requesterId, requesterRole, id)) {
            res.status(403).json({ message: "Forbidden" });
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
const hostRequestsFile = path_1.default.resolve(__dirname, "../../data/hostRequests.json");
const readHostRequests = async () => {
    try {
        const raw = await fs_1.default.promises.readFile(hostRequestsFile, "utf-8");
        return JSON.parse(raw);
    }
    catch (err) {
        if (err && err.code === "ENOENT")
            return [];
        throw err;
    }
};
const writeHostRequests = async (items) => {
    await fs_1.default.promises.mkdir(path_1.default.dirname(hostRequestsFile), { recursive: true });
    await fs_1.default.promises.writeFile(hostRequestsFile, JSON.stringify(items, null, 2), "utf-8");
};
const requestHost = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        // ensure the requester is the same user (basic protection)
        const requester = req.userId;
        if (!requester || requester !== id) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const existing = await readHostRequests();
        const already = existing.find((r) => r.userId === id && r.status === "PENDING");
        if (already) {
            res.status(409).json({ message: "Host request already pending" });
            return;
        }
        const now = new Date().toISOString();
        const reqObj = {
            id: (0, uuid_1.v4)(),
            userId: id,
            status: "PENDING",
            message: String((req.body && req.body.message) ?? null),
            createdAt: now,
            updatedAt: now
        };
        existing.push(reqObj);
        await writeHostRequests(existing);
        res.status(201).json(reqObj);
    }
    catch (error) {
        next({ error, operation: "requestHost" });
    }
};
exports.requestHost = requestHost;
const listHostRequests = async (_req, res, next) => {
    try {
        const items = await readHostRequests();
        res.json(items);
    }
    catch (error) {
        next({ error, operation: "listHostRequests" });
    }
};
exports.listHostRequests = listHostRequests;
const handleHostRequest = async (req, res, next) => {
    try {
        const requestId = req.params.requestId;
        const action = String((req.body && req.body.action) ?? "").toLowerCase();
        if (!requestId) {
            res.status(400).json({ message: "Missing request id" });
            return;
        }
        if (action !== "approve" && action !== "reject") {
            res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
            return;
        }
        const items = await readHostRequests();
        const idx = items.findIndex((r) => r.id === requestId);
        if (idx === -1) {
            res.status(404).json({ message: "Host request not found" });
            return;
        }
        const request = items[idx];
        if (request.status !== "PENDING") {
            res.status(400).json({ message: "Host request already processed" });
            return;
        }
        if (action === "approve") {
            // promote user to HOST
            await prisma_1.default.user.update({ where: { id: request.userId }, data: { role: client_1.Role.HOST } });
            request.status = "APPROVED";
        }
        else {
            request.status = "REJECTED";
        }
        request.updatedAt = new Date().toISOString();
        items[idx] = request;
        await writeHostRequests(items);
        (0, cache_1.invalidateCache)("users:stats");
        res.json(request);
    }
    catch (error) {
        next({ error, operation: "handleHostRequest" });
    }
};
exports.handleHostRequest = handleHostRequest;
