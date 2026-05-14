import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../config/prisma";

type TokenRole = "HOST" | "GUEST" | "ADMIN";

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
};

const readToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  return token || null;
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = readToken(req.headers["authorization"]);
    if (!token) {
      res.status(401).json({ message: "Missing or invalid authorization header" });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & { userId?: string; role?: TokenRole };
    if (!decoded.userId || !decoded.role) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    prisma.user.findUnique({
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
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireHost = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role !== "HOST") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
};

export const requireGuest = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role !== "GUEST") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  next();
};