"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.getListingReviews = exports.createReview = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const cache_1 = require("../config/cache");
const ids_1 = require("../utils/ids");
const ai_controller_1 = require("./ai.controller");
const prismaReview = prisma_1.default.review;
const createReview = async (req, res, next) => {
    try {
        const listingId = req.params.id;
        const { rating, comment } = req.body;
        if (!(0, ids_1.isUuid)(listingId)) {
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
        const listing = await prisma_1.default.listing.findUnique({ where: { id: listingId } });
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
        (0, cache_1.invalidateCache)(`reviews:${listingId}`);
        (0, ai_controller_1.invalidateReviewSummaryCache)(listingId);
        (0, cache_1.invalidateCache)("stats");
        res.status(201).json(review);
    }
    catch (error) {
        next({ error, operation: "createReview" });
    }
};
exports.createReview = createReview;
const getListingReviews = async (req, res, next) => {
    try {
        const listingId = req.params.id;
        if (!(0, ids_1.isUuid)(listingId)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const cacheKey = `reviews:${listingId}:${page}:${limit}`;
        const cached = (0, cache_1.getCache)(cacheKey);
        if (cached !== null) {
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
        (0, cache_1.setCache)(cacheKey, response, 30);
        res.json(response);
    }
    catch (error) {
        next({ error, operation: "getListingReviews" });
    }
};
exports.getListingReviews = getListingReviews;
const deleteReview = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid review id" });
            return;
        }
        const review = await prismaReview.findUnique({ where: { id } });
        if (!review) {
            res.status(404).json({ message: "Review not found" });
            return;
        }
        await prismaReview.delete({ where: { id } });
        (0, cache_1.invalidateCache)(`reviews:${review.listingId}`);
        (0, ai_controller_1.invalidateReviewSummaryCache)(review.listingId);
        (0, cache_1.invalidateCache)("stats");
        res.json({ message: "Review deleted successfully" });
    }
    catch (error) {
        next({ error, operation: "deleteReview" });
    }
};
exports.deleteReview = deleteReview;
