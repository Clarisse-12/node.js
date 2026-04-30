import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import prisma from "../config/prisma";
import { getCache, setCache, invalidateCache } from "../config/cache";
import { isUuid } from "../utils/ids";

const isValidRole = (value: unknown): value is Role => {
  return value === Role.HOST || value === Role.GUEST;
};

const sanitizeUser = <T extends { password: string; resetToken: string | null; resetTokenExpiry: Date | null }>(
  user: T
): Omit<T, "password" | "resetToken" | "resetTokenExpiry"> => {
  const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...safeUser } = user;
  return safeUser;
};

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            listings: true
          }
        }
      }
    });

    res.json(users.map((user) => sanitizeUser(user)));
  } catch (error) {
    next({ error, operation: "getAllUsers" });
  }
};

export const getUserStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = "users:stats";
    const cached = getCache(cacheKey);
    if (cached !== null) {
      res.json(cached);
      return;
    }

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
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

    setCache(cacheKey, stats, 300);
    res.json(stats);
  } catch (error) {
    next({ error, operation: "getUserStats" });
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    next({ error, operation: "getUserById" });
  }
};

export const getUserListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const listings = await prisma.listing.findMany({ where: { hostId: id } });
    res.json(listings);
  } catch (error) {
    next({ error, operation: "getUserListings" });
  }
};

export const getUserBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { guestId: id },
      include: {
        listing: true
      }
    });

    res.json(bookings);
  } catch (error) {
    next({ error, operation: "getUserBookings" });
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, username, phone, password, role, avatar, bio } = req.body as {
      name?: string;
      email?: string;
      username?: string;
      phone?: string;
      password?: string;
      role?: Role;
      avatar?: string;
      bio?: string;
    };

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

    const duplicateEmail = await prisma.user.findFirst({ where: { email } });
    if (duplicateEmail) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
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

    invalidateCache("users:stats");

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    next({ error, operation: "createUser" });
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const { name, email, username, phone, password, role, avatar, bio } = req.body as {
      name?: string;
      email?: string;
      username?: string;
      phone?: string;
      password?: string;
      role?: Role;
      avatar?: string;
      bio?: string;
    };

    if (role !== undefined && !isValidRole(role)) {
      res.status(400).json({ message: "Role must be HOST or GUEST" });
      return;
    }

    const passwordUpdate = password ? { password: await bcrypt.hash(password, 10) } : {};

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const user = await prisma.user.update({
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

    invalidateCache("users:stats");

    res.json(sanitizeUser(user));
  } catch (error) {
    next({ error, operation: "updateUser" });
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const existing = await prisma.user.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const deleted = await prisma.user.delete({ where: { id } });

    invalidateCache("users:stats");

    res.json(deleted);
  } catch (error) {
    next({ error, operation: "deleteUser" });
  }
};
