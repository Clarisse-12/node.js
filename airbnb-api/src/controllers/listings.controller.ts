import { NextFunction, Request, Response } from "express";
import { ListingType, Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getOptimizedUrl } from "../config/cloudinary.js";
import { getCache, setCache, invalidateCache } from "../config/cache";

const VALID_SORT_FIELDS: Array<"pricePerNight" | "createdAt"> = ["pricePerNight", "createdAt"];

const isListingType = (value: unknown): value is ListingType => {
  return Object.values(ListingType).includes(value as ListingType);
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const getAllListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { location, type, maxPrice, page, limit, sortBy, order } = req.query;
    const pageNumber = parsePositiveInt(page, 1);
    const limitNumber = parsePositiveInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.ListingWhereInput = {};

    if (location) {
      where.location = {
        contains: String(location),
        mode: "insensitive"
      };
    }

    if (type) {
      const enumType = String(type).toUpperCase();
      if (!isListingType(enumType)) {
        res.status(400).json({ message: "Invalid listing type" });
        return;
      }
      where.type = enumType;
    }

    if (maxPrice !== undefined) {
      const parsedMaxPrice = Number(maxPrice);
      if (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        res.status(400).json({ message: "maxPrice must be a positive number" });
        return;
      }
      where.pricePerNight = { lte: parsedMaxPrice };
    }

    const sortField = VALID_SORT_FIELDS.includes(sortBy as "pricePerNight" | "createdAt")
      ? (sortBy as "pricePerNight" | "createdAt")
      : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const listings = await prisma.listing.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: {
        [sortField]: sortOrder
      },
      select: {
        id: true,
        title: true,
        location: true,
        pricePerNight: true,
        photos: {
          select: {
            id: true,
            url: true,
            publicId: true
          }
        },
        host: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      page: pageNumber,
      limit: limitNumber,
      data: listings.map((listing) => ({
        ...listing,
        photos: listing.photos.map((photo) => ({
          ...photo,
          optimizedUrl: getOptimizedUrl(photo.url, 600, 400)
        }))
      }))
    });
  } catch (error) {
    next({ error, operation: "getAllListings" });
  }
};

export const searchListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { location, type, minPrice, maxPrice, guests, page, limit } = req.query;
    const pageNumber = parsePositiveInt(page, 1);
    const limitNumber = parsePositiveInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.ListingWhereInput = {};

    if (location) {
      where.location = {
        contains: String(location),
        mode: "insensitive"
      };
    }

    if (type) {
      const enumType = String(type).toUpperCase();
      if (!isListingType(enumType)) {
        res.status(400).json({ message: "Invalid listing type" });
        return;
      }
      where.type = enumType;
    }

    if (minPrice !== undefined) {
      const parsedMinPrice = Number(minPrice);
      if (Number.isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        res.status(400).json({ message: "minPrice must be a positive number" });
        return;
      }
      where.pricePerNight = {
        ...(typeof where.pricePerNight === 'object' && where.pricePerNight !== null ? where.pricePerNight : {}),
        gte: parsedMinPrice
      };
    }

    if (maxPrice !== undefined) {
      const parsedMaxPrice = Number(maxPrice);
      if (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        res.status(400).json({ message: "maxPrice must be a positive number" });
        return;
      }
      where.pricePerNight = {
        ...(typeof where.pricePerNight === 'object' && where.pricePerNight !== null ? where.pricePerNight : {}),
        lte: parsedMaxPrice
      };
    }

    if (guests !== undefined) {
      const parsedGuests = Number(guests);
      if (!Number.isInteger(parsedGuests) || parsedGuests <= 0) {
        res.status(400).json({ message: "guests must be a positive integer" });
        return;
      }
      where.guests = { gte: parsedGuests };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limitNumber,
        select: {
          id: true,
          title: true,
          location: true,
          pricePerNight: true,
          guests: true,
          type: true,
          photos: {
            select: {
              url: true,
              publicId: true
            }
          },
          host: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.listing.count({ where })
    ]);

    res.json({
      data: listings.map((listing) => ({
        ...listing,
        photos: listing.photos.map((photo) => ({
          ...photo,
          optimizedUrl: getOptimizedUrl(photo.url, 600, 400)
        }))
      })),
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    next({ error, operation: "searchListings" });
  }
};
export const getListingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: true,
        bookings: true,
        photos: true
      }
    });

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    res.json({
      ...listing,
      photos: listing.photos.map((photo) => ({
        ...photo,
        optimizedUrl: getOptimizedUrl(photo.url, 900, 600)
      }))
    });
  } catch (error) {
    next({ error, operation: "getListingById" });
  }
};

type ListingStatsRow = {
  location: string;
  total: number;
  avg_price: string;
  min_price: number;
  max_price: number;
};

export const getListingStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = "stats:listings";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [total, avgPrice, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({
        _avg: { pricePerNight: true }
      }),
      prisma.listing.groupBy({
        by: ["location"],
        _count: true,
        _avg: { pricePerNight: true }
      }),
      prisma.listing.groupBy({
        by: ["type"],
        _count: true,
        _avg: { pricePerNight: true }
      })
    ]);

    const stats = {
      totalListings: total,
      averagePrice: Math.round((avgPrice._avg.pricePerNight || 0) * 100) / 100,
      byLocation: byLocation.map((loc) => ({
        location: loc.location,
        count: loc._count,
        avgPrice: Math.round((loc._avg.pricePerNight || 0) * 100) / 100
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count,
        avgPrice: Math.round((t._avg.pricePerNight || 0) * 100) / 100
      }))
    };

    setCache(cacheKey, stats, 300);
    res.json(stats);
  } catch (error) {
    next({ error, operation: "getListingStats" });
  }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, location, pricePerNight, guests, type, amenities, rating } = req.body as {
      title?: string;
      description?: string;
      location?: string;
      pricePerNight?: number;
      guests?: number;
      type?: ListingType;
      amenities?: string[];
      rating?: number;
    };

    if (
      !title ||
      !description ||
      !location ||
      pricePerNight === undefined ||
      guests === undefined ||
      type === undefined ||
      !Array.isArray(amenities)
    ) {
      res.status(400).json({
        message:
          "Missing required fields: title, description, location, pricePerNight, guests, type, amenities"
      });
      return;
    }

    if (!isListingType(type)) {
      res.status(400).json({ message: "Invalid listing type" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        location,
        pricePerNight: Number(pricePerNight),
        guests: Number(guests),
        type,
        amenities,
        rating,
        hostId: req.userId
      }
    });

    res.status(201).json(listing);
  } catch (error) {
    next({ error, operation: "createListing" });
  }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    const { title, description, location, pricePerNight, guests, type, amenities, rating, hostId } = req.body as {
      title?: string;
      description?: string;
      location?: string;
      pricePerNight?: number;
      guests?: number;
      type?: ListingType;
      amenities?: string[];
      rating?: number;
      hostId?: number;
    };

    if (type !== undefined && !isListingType(type)) {
      res.status(400).json({ message: "Invalid listing type" });
      return;
    }

    if (amenities !== undefined && !Array.isArray(amenities)) {
      res.status(400).json({ message: "Amenities must be an array of strings" });
      return;
    }

    const existing = await prisma.listing.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (existing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only edit your own listings" });
      return;
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        title,
        description,
        location,
        pricePerNight,
        guests,
        type,
        amenities,
        rating,
        hostId: existing.hostId
      }
    });

    res.json(listing);
  } catch (error) {
    next({ error, operation: "updateListing" });
  }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    const existing = await prisma.listing.findFirst({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (existing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only delete your own listings" });
      return;
    }

    const deleted = await prisma.listing.delete({ where: { id } });
    res.json(deleted);
  } catch (error) {
    next({ error, operation: "deleteListing" });
  }
};
