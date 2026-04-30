import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";
import { getCache, setCache, invalidateCache } from "../config/cache";
import { AuthRequest } from "../middlewares/auth.middleware";

const prismaReview = (prisma as any).review;

export const createReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = Number(req.params.id);
    const { rating, comment } = req.body as {
      rating?: number;
      comment?: string;
    };

    if (!Number.isInteger(listingId) || listingId <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    if (rating === undefined || !comment) {
      res.status(400).json({ message: "Missing required fields: rating, comment" });
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const review = await prismaReview.create({
      data: {
        userId: req.userId,
        listingId,
        rating,
        comment
      }
    });

    invalidateCache(`reviews:${listingId}`);
    invalidateCache("stats");

    res.status(201).json(review);
  } catch (error) {
    next({ error, operation: "createReview" });
  }
};

export const getListingReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const cacheKey = `reviews:${listingId}:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [reviews, total] = await Promise.all([
      prismaReview.findMany({
        where: { listingId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              avatar: true
            }
          }
        }
      }),
      prismaReview.count({ where: { listingId } })
    ]);

    const response = {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    setCache(cacheKey, response, 30);
    res.json(response);
  } catch (error) {
    next({ error, operation: "getListingReviews" });
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "Invalid review id" });
      return;
    }

    const review = await prismaReview.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ message: "Review not found" });
      return;
    }

    await prismaReview.delete({ where: { id } });

    invalidateCache(`reviews:${review.listingId}`);
    invalidateCache("stats");

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    next({ error, operation: "deleteReview" });
  }
};
