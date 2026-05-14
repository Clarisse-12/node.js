"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireGuest = exports.requireHost = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const getJwtSecret = () => {
    const secret = process.env["JWT_SECRET"];
    if (!secret) {
        throw new Error("JWT_SECRET is not set");
    }
    return secret;
};
const readToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.split(" ")[1];
    return token || null;
};
const authenticate = (req, res, next) => {
    try {
        const token = readToken(req.headers["authorization"]);
        if (!token) {
            res.status(401).json({ message: "Missing or invalid authorization header" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
        if (!decoded.userId || !decoded.role) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, isActive: true }
        }).then((user) => {
            if (!user) {
                res.status(401).json({ message: "Invalid or expired token" });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({ message: "Account disabled" });
                return;
            }
            req.userId = decoded.userId;
            req.role = decoded.role;
            next();
        }).catch(() => {
            res.status(401).json({ message: "Invalid or expired token" });
        });
    }
    catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
const requireHost = (req, res, next) => {
    if (req.role !== "HOST") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};
exports.requireHost = requireHost;
const requireGuest = (req, res, next) => {
    if (req.role !== "GUEST") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};
exports.requireGuest = requireGuest;
const requireAdmin = (req, res, next) => {
    if (req.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
