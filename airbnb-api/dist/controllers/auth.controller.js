"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getMe = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const email_js_1 = require("../config/email.js");
const emails_js_1 = require("../templates/emails.js");
const getJwtSecret = () => {
    const secret = process.env["JWT_SECRET"];
    if (!secret) {
        throw new Error("JWT_SECRET is not set");
    }
    return secret;
};
const getJwtExpiresIn = () => process.env["JWT_EXPIRES_IN"] ?? "7d";
const sanitizeUser = (user) => {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpiry;
    return safeUser;
};
const isRole = (value) => value === client_1.Role.HOST || value === client_1.Role.GUEST;
const register = async (req, res, next) => {
    try {
        const { name, email, username, phone, password, role } = req.body;
        if (!name || !email || !username || !phone || !password || !role) {
            res.status(400).json({ message: "Missing required fields: name, email, username, phone, password, role" });
            return;
        }
        if (!isRole(role)) {
            res.status(400).json({ message: "Role must be HOST or GUEST" });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ message: "Password must be at least 8 characters" });
            return;
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
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
                role
            }
        });
        res.status(201).json(sanitizeUser(user));
        void (0, email_js_1.sendEmail)(email, "Welcome to Airbnb!", (0, emails_js_1.welcomeEmail)(name, role)).catch((emailError) => {
            console.warn("Welcome email failed", {
                operation: "register",
                message: emailError instanceof Error ? emailError.message : emailError
            });
        });
    }
    catch (error) {
        next({ error, operation: "register" });
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Missing required fields: email, password" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const userPassword = user.password;
        if (!userPassword) {
            res.status(500).json({ message: "User password is not available" });
            return;
        }
        const passwordMatches = await bcrypt_1.default.compare(password, userPassword);
        if (!passwordMatches) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
        res.json({ token, user: sanitizeUser(user) });
    }
    catch (error) {
        next({ error, operation: "login" });
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.userId }
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (user.role === client_1.Role.HOST) {
            const host = await prisma_1.default.user.findUnique({
                where: { id: user.id },
                include: {
                    listings: true
                }
            });
            if (!host) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.json(sanitizeUser(host));
            return;
        }
        const guest = await prisma_1.default.user.findUnique({
            where: { id: user.id },
            include: {
                bookings: {
                    include: {
                        listing: true
                    }
                }
            }
        });
        if (!guest) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(sanitizeUser(guest));
    }
    catch (error) {
        next({ error, operation: "getMe" });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res, next) => {
    try {
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: "Missing required fields: currentPassword, newPassword" });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ message: "Password must be at least 8 characters" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const userPassword = user.password;
        if (!userPassword) {
            res.status(500).json({ message: "User password is not available" });
            return;
        }
        const currentPasswordMatches = await bcrypt_1.default.compare(currentPassword, userPassword);
        if (!currentPasswordMatches) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        res.json({ message: "Password changed successfully" });
    }
    catch (error) {
        next({ error, operation: "changePassword" });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Missing required field: email" });
            return;
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        let resetLink = null;
        if (user) {
            const rawToken = crypto_1.default.randomBytes(32).toString("hex");
            const hashedToken = crypto_1.default.createHash("sha256").update(rawToken).digest("hex");
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: {
                    resetToken: hashedToken,
                    resetTokenExpiry
                }
            });
            const baseUrl = (process.env["API_URL"] || "http://localhost:3000").replace(/\/$/, "");
            resetLink = `${baseUrl}/api/v1/auth/reset-password/${rawToken}`;
        }
        res.status(200).json({ message: "If that email is registered, a reset link has been sent" });
        if (user && resetLink) {
            void (0, email_js_1.sendEmail)(user.email, "Reset your Airbnb password", (0, emails_js_1.passwordResetEmail)(user.name, resetLink)).catch((emailError) => {
                console.warn("Password reset email failed", {
                    operation: "forgotPassword",
                    message: emailError instanceof Error ? emailError.message : emailError
                });
            });
        }
    }
    catch (error) {
        next({ error, operation: "forgotPassword" });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const token = req.params["token"];
        const { newPassword } = req.body;
        if (!newPassword) {
            res.status(400).json({ message: "Missing required field: newPassword" });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ message: "Password must be at least 8 characters" });
            return;
        }
        const hashedToken = crypto_1.default.createHash("sha256").update(String(token)).digest("hex");
        const user = await prisma_1.default.user.findFirst({
            where: {
                resetToken: hashedToken,
                resetTokenExpiry: {
                    gt: new Date()
                }
            }
        });
        if (!user) {
            res.status(400).json({ message: "Invalid or expired reset token" });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });
        res.status(200).json({ message: "Password reset successfully" });
        void (0, email_js_1.sendEmail)(user.email, "Password Reset Successful", (0, emails_js_1.passwordResetSuccessEmail)(user.name)).catch((emailError) => {
            console.warn("Password reset success email failed", {
                operation: "resetPassword",
                message: emailError instanceof Error ? emailError.message : emailError
            });
        });
    }
    catch (error) {
        next({ error, operation: "resetPassword" });
    }
};
exports.resetPassword = resetPassword;
