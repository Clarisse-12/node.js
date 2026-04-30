"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rateLimitHandler = (message) => {
    return (_req, res, _next, options) => {
        res.status(429).json({ message: options.message || message });
    };
};
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Too many requests from this IP, please try again after 15 minutes")
});
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many POST requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler("Too many POST requests from this IP, please try again after 15 minutes")
});
