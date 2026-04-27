import { NextFunction, Request, Response } from "express";
import { BookingStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email.js";
import { bookingConfirmationEmail } from "../templates/emails.js";

const isBookingStatus = (value: unknown): value is BookingStatus => {
  return Object.values(BookingStatus).includes(value as BookingStatus);
};

const millisecondsPerDay = 1000 * 60 * 60 * 24;
const activeBookingStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

const formatDate = (value: Date): string => {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const bookingCancellationTemplate = (
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string => {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #FF5A5F; margin-bottom: 16px;">Booking Cancelled</h2>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        <p>Hi ${guestName},</p>
        <p>Your booking for <strong>${listingTitle}</strong> has been cancelled.</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p>You can explore other listings anytime.</p>
      </div>
    </div>
  `;
};

const isIsoDateOnly = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const parseIsoDateOnly = (value: string): Date | null => {
  if (!isIsoDateOnly(value)) return null;

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;

  return isSameDate ? parsed : null;
};

export const getAllBookings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: {
          select: {
            name: true
          }
        },
        listing: {
          select: {
            title: true
          }
        }
      }
    });

    res.json(bookings);
  } catch (error) {
    next({ error, operation: "getAllBookings" });
  }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid booking id" });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        listing: true
      }
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.json(booking);
  } catch (error) {
    next({ error, operation: "getBookingById" });
  }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { listingId, checkIn, checkOut } = req.body as {
      listingId?: number;
      checkIn?: string;
      checkOut?: string;
    };

    if (listingId === undefined || checkIn === undefined || checkOut === undefined) {
      res.status(400).json({ message: "Missing required fields: listingId, checkIn, checkOut" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (typeof checkIn !== "string" || typeof checkOut !== "string") {
      res.status(400).json({ message: "checkIn and checkOut must be strings in YYYY-MM-DD format" });
      return;
    }

    const requestedListingId = Number(listingId);
    if (!Number.isInteger(requestedListingId) || requestedListingId <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    const checkInDate = parseIsoDateOnly(checkIn);
    const checkOutDate = parseIsoDateOnly(checkOut);
    if (!checkInDate || !checkOutDate) {
      res.status(400).json({ message: "checkIn and checkOut must be valid calendar dates in YYYY-MM-DD format" });
      return;
    }

    if (checkInDate.getTime() >= checkOutDate.getTime()) {
      res.status(400).json({ message: "checkOut must be after checkIn" });
      return;
    }

    if (checkInDate.getTime() <= new Date().getTime()) {
      res.status(400).json({ message: "checkIn must be in the future" });
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id: requestedListingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const conflict = await prisma.booking.findFirst({
      where: {
        listingId: requestedListingId,
        status: { in: activeBookingStatuses },
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate }
      }
    });

    if (conflict) {
      res.status(409).json({ message: "Booking conflict for the selected dates" });
      return;
    }

    const dayCount = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / millisecondsPerDay);
    const totalPrice = dayCount * listing.pricePerNight;

    const booking = await prisma.booking.create({
      data: {
        guestId: req.userId,
        listingId: requestedListingId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice,
        status: BookingStatus.PENDING
      }
    });

    res.status(201).json(booking);

    const guest = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        email: true,
        name: true
      }
    });

    if (guest) {
      void sendEmail(
        guest.email,
        "Your booking is confirmed",
        bookingConfirmationEmail(
          guest.name,
          listing.title,
          listing.location,
          formatDate(checkInDate),
          formatDate(checkOutDate),
          totalPrice
        )
      ).catch((emailError) => {
        console.warn("Booking confirmation email failed", {
          operation: "createBooking",
          message: emailError instanceof Error ? emailError.message : emailError
        });
      });
    }
  } catch (error) {
    next({ error, operation: "createBooking" });
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid booking id" });
      return;
    }

    const { status } = req.body as { status?: BookingStatus };
    if (!isBookingStatus(status)) {
      res.status(400).json({ message: "Invalid booking status" });
      return;
    }

    const existing = await prisma.booking.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status }
    });

    res.json(booking);
  } catch (error) {
    next({ error, operation: "updateBookingStatus" });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid booking id" });
      return;
    }

    const existing = await prisma.booking.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (existing.guestId !== req.userId) {
      res.status(403).json({ message: "You can only cancel your own bookings" });
      return;
    }

    if (existing.status === BookingStatus.CANCELLED) {
      res.status(400).json({ message: "Booking is already cancelled" });
      return;
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: {
        guest: {
          select: {
            email: true,
            name: true
          }
        },
        listing: {
          select: {
            title: true
          }
        }
      }
    });

    res.json(booking);

    void sendEmail(
      booking.guest.email,
      "Your booking has been cancelled",
      bookingCancellationTemplate(
        booking.guest.name,
        booking.listing.title,
        formatDate(existing.checkIn),
        formatDate(existing.checkOut)
      )
    ).catch((emailError) => {
      console.warn("Booking cancellation email failed", {
        operation: "deleteBooking",
        message: emailError instanceof Error ? emailError.message : emailError
      });
    });
  } catch (error) {
    next({ error, operation: "deleteBooking" });
  }
};