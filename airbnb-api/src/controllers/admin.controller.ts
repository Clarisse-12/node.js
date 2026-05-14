import { NextFunction, Request, Response } from "express";
import { BookingStatus, Role } from "@prisma/client";
import prisma from "../config/prisma";
import { isUuid } from "../utils/ids";

const sanitizeUser = <T extends Record<string, unknown>>(user: T): T => {
  const safeUser = { ...user } as Record<string, unknown>;
  delete safeUser.password;
  delete safeUser.resetToken;
  delete safeUser.resetTokenExpiry;
  return safeUser as T;
};

export const getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
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
      revenue,
      recentUsers,
      recentListings,
      recentBookings
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: Role.HOST } }),
      prisma.user.count({ where: { role: Role.GUEST } }),
      prisma.listing.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: BookingStatus.CONFIRMED }
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: { listings: true, bookings: true }
          }
        }
      }),
      prisma.listing.findMany({
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
      prisma.booking.findMany({
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
  } catch (error) {
    next({ error, operation: "getOverview" });
  }
};

export const getUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { listings: true, bookings: true, reviews: true }
        }
      }
    });

    res.json(users.map((user) => sanitizeUser(user)));
  } catch (error) {
    next({ error, operation: "getUsers" });
  }
};

export const getListings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listings = await prisma.listing.findMany({
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
  } catch (error) {
    next({ error, operation: "getListings" });
  }
};

export const getBookings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
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
  } catch (error) {
    next({ error, operation: "getBookings" });
  }
};

export const setUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const isActive = Boolean((req.body as { isActive?: unknown })?.isActive);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive }
    });

    res.json(sanitizeUser(updated));
  } catch (error) {
    next({ error, operation: "setUserStatus" });
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (error) {
    next({ error, operation: "deleteUser" });
  }
};

export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get year from query parameter, default to current year
    const yearParam = (req.query.year as string) || String(new Date().getFullYear());
    const selectedYear = parseInt(yearParam, 10);

    if (isNaN(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
      res.status(400).json({ message: "Invalid year parameter" });
      return;
    }

    // Get all 12 months for the selected year
    const months: { month: string; date: Date }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(selectedYear, i, 1);
      const monthStr = date.toLocaleString("en-US", { month: "short" });
      months.push({ month: monthStr, date });
    }

    const monthlyData = await Promise.all(
      months.map(async ({ month, date }) => {
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        
        const [usersCreated, listingsCreated, bookingsCreated] = await Promise.all([
          prisma.user.count({
            where: {
              createdAt: { gte: date, lt: nextMonth }
            }
          }),
          prisma.listing.count({
            where: {
              createdAt: { gte: date, lt: nextMonth }
            }
          }),
          prisma.booking.count({
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
      })
    );

    res.json(monthlyData);
  } catch (error) {
    next({ error, operation: "getMonthlyStats" });
  }
};