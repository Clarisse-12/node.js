import rateLimit from "express-rate-limit";
import { NextFunction, Request, Response } from "express";

const rateLimitHandler = (message: string) => {
  return (_req: Request, res: Response, _next: NextFunction, options: { message?: string }) => {
    res.status(429).json({ message: options.message || message });
  };
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many requests from this IP, please try again after 15 minutes")
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many POST requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many POST requests from this IP, please try again after 15 minutes")
});
