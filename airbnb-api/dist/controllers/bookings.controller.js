"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBookings = exports.deleteBooking = exports.updateBookingStatus = exports.createBooking = exports.getBookingById = exports.getAllBookings = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const email_js_1 = require("../config/email.js");
const emails_js_1 = require("../templates/emails.js");
const ids_1 = require("../utils/ids");
const cloudinary_js_1 = require("../config/cloudinary.js");
const isBookingStatus = (value) => {
    return Object.values(client_1.BookingStatus).includes(value);
};
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const activeBookingStatuses = [client_1.BookingStatus.PENDING, client_1.BookingStatus.CONFIRMED];
const formatDate = (value) => {
    return value.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
};
const bookingCancellationTemplate = (guestName, listingTitle, checkIn, checkOut, reason) => {
    return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 640px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #FF5A5F; margin-bottom: 16px;">Booking Cancelled</h2>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        <p>Hi ${guestName},</p>
        <p>Your booking for <strong>${listingTitle}</strong> has been cancelled.</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You can explore other listings anytime.</p>
      </div>
    </div>
  `;
};
const isIsoDateOnly = (value) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
};
const parseIsoDateOnly = (value) => {
    if (!isIsoDateOnly(value))
        return null;
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const isSameDate = parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() + 1 === month &&
        parsed.getUTCDate() === day;
    return isSameDate ? parsed : null;
};
const getAllBookings = async (req, res, next) => {
    try {
        // This endpoint requires authentication
        if (!req.userId || !req.role) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        let where = {};
        // If HOST, show bookings for their listings only
        if (req.role === "HOST") {
            where = {
                listing: {
                    hostId: req.userId
                }
            };
        }
        // If GUEST, show their own bookings only
        else if (req.role === "GUEST") {
            where = { guestId: req.userId };
        }
        else if (req.role === "ADMIN") {
            where = {};
        }
        const [bookings, total] = await Promise.all([
            prisma_1.default.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    guest: {
                        select: {
                            name: true
                        }
                    },
                    listing: {
                        select: {
                            title: true,
                            location: true,
                            photos: {
                                select: {
                                    url: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma_1.default.booking.count({ where })
        ]);
        const bookingsWithOptimized = bookings.map(booking => ({
            ...booking,
            listing: booking.listing ? {
                ...booking.listing,
                photos: booking.listing.photos.map(photo => ({
                    url: photo.url,
                    optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 80, 60)
                }))
            } : booking.listing
        }));
        res.json({
            data: bookingsWithOptimized,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        next({ error, operation: "getAllBookings" });
    }
};
exports.getAllBookings = getAllBookings;
const getBookingById = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid booking id" });
            return;
        }
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: {
                guest: true,
                listing: {
                    include: {
                        photos: {
                            select: {
                                url: true
                            }
                        }
                    }
                }
            }
        });
        if (!booking) {
            res.status(404).json({ message: "Booking not found" });
            return;
        }
        const bookingWithOptimized = {
            ...booking,
            listing: booking.listing ? {
                ...booking.listing,
                photos: booking.listing.photos.map(photo => ({
                    url: photo.url,
                    optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 900, 600)
                }))
            } : booking.listing
        };
        res.json(bookingWithOptimized);
    }
    catch (error) {
        next({ error, operation: "getBookingById" });
    }
};
exports.getBookingById = getBookingById;
const createBooking = async (req, res, next) => {
    try {
        const { listingId, checkIn, checkOut } = req.body;
        if (listingId === undefined || checkIn === undefined || checkOut === undefined) {
            res.status(400).json({ message: "Missing required fields: listingId, checkIn, checkOut" });
            return;
        }
        const guestId = req.userId;
        if (!guestId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        if (typeof checkIn !== "string" || typeof checkOut !== "string") {
            res.status(400).json({ message: "checkIn and checkOut must be strings in YYYY-MM-DD format" });
            return;
        }
        const requestedListingId = listingId;
        if (!(0, ids_1.isUuid)(requestedListingId)) {
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
        const listing = await prisma_1.default.listing.findFirst({ where: { id: requestedListingId } });
        if (!listing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        // const conflict = await prisma.booking.findFirst({
        //   where: {
        //     listingId: requestedListingId,
        //     status: { in: activeBookingStatuses },
        //     checkIn: { lt: checkOutDate },
        //     checkOut: { gt: checkInDate }
        //   }
        // });
        // if (conflict) {
        //   res.status(409).json({ message: "Booking conflict for the selected dates" });
        //   return;
        // }
        const dayCount = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / millisecondsPerDay);
        const totalPrice = dayCount * listing.pricePerNight;
        // const booking = await prisma.booking.create({
        //   data: {
        //     guestId: req.userId,
        //     listingId: requestedListingId,
        //     checkIn: checkInDate,
        //     checkOut: checkOutDate,
        //     totalPrice,
        //     status: BookingStatus.PENDING
        //   }
        // });
        // res.status(201).json(booking);
        const newBooking = await prisma_1.default.$transaction(async (tx) => {
            const conflict = await tx.booking.findFirst({
                where: {
                    listingId: requestedListingId,
                    status: { in: activeBookingStatuses },
                    checkIn: { lt: checkOutDate },
                    checkOut: { gt: checkInDate }
                }
            });
            if (conflict) {
                throw new Error("BOOKING_CONFLICT");
            }
            return tx.booking.create({
                data: {
                    listingId: requestedListingId,
                    guestId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    totalPrice,
                    status: client_1.BookingStatus.PENDING
                },
                include: {
                    guest: true,
                    listing: true
                }
            });
        });
        res.status(201).json(newBooking);
        const guest = await prisma_1.default.user.findUnique({
            where: { id: req.userId },
            select: {
                email: true,
                name: true
            }
        });
        if (guest) {
            void (0, email_js_1.sendEmail)(guest.email, "Your booking is confirmed", (0, emails_js_1.bookingConfirmationEmail)(guest.name, listing.title, listing.location, formatDate(checkInDate), formatDate(checkOutDate), totalPrice)).catch((emailError) => {
                console.warn("Booking confirmation email failed", {
                    operation: "createBooking",
                    message: emailError instanceof Error ? emailError.message : emailError
                });
            });
        }
    }
    catch (error) {
        if (error instanceof Error && error.message === "BOOKING_CONFLICT") {
            res.status(409).json({ message: "Booking conflict for the selected dates" });
            return;
        }
        next({ error, operation: "createBooking" });
    }
};
exports.createBooking = createBooking;
const updateBookingStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid booking id" });
            return;
        }
        const { status, reason } = req.body;
        if (!isBookingStatus(status)) {
            res.status(400).json({ message: "Invalid booking status" });
            return;
        }
        if (status === client_1.BookingStatus.CANCELLED && !String(reason || "").trim()) {
            res.status(400).json({ message: "Cancellation reason is required" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        if (req.role !== "HOST" && req.role !== "ADMIN") {
            res.status(403).json({ message: "Only hosts can update booking status" });
            return;
        }
        const existing = await prisma_1.default.booking.findFirst({
            where: { id },
            include: {
                guest: {
                    select: {
                        email: true,
                        name: true
                    }
                },
                listing: {
                    select: {
                        title: true,
                        hostId: true
                    }
                }
            }
        });
        if (!existing) {
            res.status(404).json({ message: "Booking not found" });
            return;
        }
        if (req.role === "HOST" && existing.listing.hostId !== req.userId) {
            res.status(403).json({ message: "You can only manage bookings for your own listings" });
            return;
        }
        if (existing.status === client_1.BookingStatus.CANCELLED && status !== client_1.BookingStatus.CANCELLED) {
            res.status(400).json({ message: "Cancelled bookings cannot be updated" });
            return;
        }
        const booking = await prisma_1.default.booking.update({
            where: { id },
            data: {
                status,
                cancellationReason: status === client_1.BookingStatus.CANCELLED ? String(reason).trim() : existing.cancellationReason,
                cancelledByRole: status === client_1.BookingStatus.CANCELLED ? client_1.BookingCancelledBy.HOST : existing.cancelledByRole
            },
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
        if (status === client_1.BookingStatus.CANCELLED) {
            void (0, email_js_1.sendEmail)(booking.guest.email, "Your booking has been cancelled", bookingCancellationTemplate(booking.guest.name, booking.listing.title, formatDate(existing.checkIn), formatDate(existing.checkOut), booking.cancellationReason || undefined)).catch((emailError) => {
                console.warn("Booking cancellation email failed", {
                    operation: "updateBookingStatus",
                    message: emailError instanceof Error ? emailError.message : emailError
                });
            });
        }
    }
    catch (error) {
        next({ error, operation: "updateBookingStatus" });
    }
};
exports.updateBookingStatus = updateBookingStatus;
const deleteBooking = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid booking id" });
            return;
        }
        const existing = await prisma_1.default.booking.findFirst({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: "Booking not found" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        // fetch listing + host info
        const listing = await prisma_1.default.listing.findUnique({ where: { id: existing.listingId }, include: { host: { select: { id: true, email: true, name: true } } } });
        // If the requester is the guest -> perform cancellation (set status CANCELLED)
        if (existing.guestId === req.userId) {
            if (existing.status === client_1.BookingStatus.CANCELLED) {
                res.status(400).json({ message: "Booking is already cancelled" });
                return;
            }
            const { reason } = req.body;
            if (!String(reason || "").trim()) {
                res.status(400).json({ message: "Cancellation reason is required" });
                return;
            }
            const booking = await prisma_1.default.booking.update({
                where: { id },
                data: {
                    status: client_1.BookingStatus.CANCELLED,
                    cancellationReason: String(reason).trim(),
                    cancelledByRole: client_1.BookingCancelledBy.GUEST
                },
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
            // notify guest
            void (0, email_js_1.sendEmail)(booking.guest.email, "Your booking has been cancelled", bookingCancellationTemplate(booking.guest.name, booking.listing.title, formatDate(existing.checkIn), formatDate(existing.checkOut), booking.cancellationReason || undefined)).catch((emailError) => {
                console.warn("Booking cancellation email failed", {
                    operation: "deleteBooking",
                    message: emailError instanceof Error ? emailError.message : emailError
                });
            });
            // notify host (if available)
            if (listing && listing.host && listing.host.email) {
                const hostEmail = listing.host.email;
                const hostName = listing.host.name || 'Host';
                const hostTemplate = `Hi ${hostName},\n\nThe booking for '${listing.title}' has been cancelled by the guest.\n\nCheck-in: ${formatDate(existing.checkIn)}\nCheck-out: ${formatDate(existing.checkOut)}\nReason: ${booking.cancellationReason || 'No reason provided'}\n\nPlease review your bookings.`;
                void (0, email_js_1.sendEmail)(hostEmail, 'Booking cancelled - action required', hostTemplate).catch(() => { });
            }
            return;
        }
        // Hosts should keep the booking record so both sides can continue to see the reason.
        if (req.role === 'HOST') {
            res.status(403).json({ message: "Hosts can cancel bookings, but cannot delete them" });
            return;
        }
        // Otherwise forbidden
        res.status(403).json({ message: "You can only cancel your own bookings" });
    }
    catch (error) {
        next({ error, operation: "deleteBooking" });
    }
};
exports.deleteBooking = deleteBooking;
const getUserBookings = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        if (!(0, ids_1.isUuid)(userId)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const [bookings, total] = await Promise.all([
            prisma_1.default.booking.findMany({
                where: { guestId: userId },
                skip,
                take: limit,
                include: {
                    listing: {
                        select: {
                            id: true,
                            title: true,
                            location: true,
                            pricePerNight: true,
                            photos: {
                                select: {
                                    url: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma_1.default.booking.count({ where: { guestId: userId } })
        ]);
        const bookingsWithOptimized = bookings.map(booking => ({
            ...booking,
            listing: booking.listing ? {
                ...booking.listing,
                photos: booking.listing.photos.map(photo => ({
                    url: photo.url,
                    optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 80, 60)
                }))
            } : booking.listing
        }));
        res.json({
            data: bookingsWithOptimized,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        next({ error, operation: "getUserBookings" });
    }
};
exports.getUserBookings = getUserBookings;
