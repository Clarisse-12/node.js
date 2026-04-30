"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteListing = exports.updateListing = exports.createListing = exports.getListingStats = exports.getListingById = exports.searchListings = exports.getAllListings = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const cloudinary_js_1 = require("../config/cloudinary.js");
const cache_1 = require("../config/cache");
const ids_1 = require("../utils/ids");
const VALID_SORT_FIELDS = ["pricePerNight", "createdAt"];
const serializeQuery = (query) => {
    return Object.keys(query)
        .sort()
        .map((key) => `${key}=${JSON.stringify(query[key])}`)
        .join("&");
};
const listingListCacheKey = (query) => {
    return `listings:list:${serializeQuery(query)}`;
};
const invalidateListingListCaches = () => {
    (0, cache_1.invalidateCache)("listings:list:");
};
const invalidateListingStatsCache = () => {
    (0, cache_1.invalidateCache)("listings:stats");
};
const invalidateListingReviewCaches = (listingId) => {
    (0, cache_1.invalidateCache)(`reviews:${listingId}:`);
};
const isListingType = (value) => {
    return Object.values(client_1.ListingType).includes(value);
};
const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value ?? "");
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
const getAllListings = async (req, res, next) => {
    try {
        const { location, type, maxPrice, page, limit, sortBy, order } = req.query;
        const cacheKey = listingListCacheKey(req.query);
        const cached = (0, cache_1.getCache)(cacheKey);
        if (cached !== null) {
            res.json(cached);
            return;
        }
        const pageNumber = parsePositiveInt(page, 1);
        const limitNumber = parsePositiveInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;
        const where = {};
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
        const sortField = VALID_SORT_FIELDS.includes(sortBy)
            ? sortBy
            : "createdAt";
        const sortOrder = order === "asc" ? "asc" : "desc";
        const listings = await prisma_1.default.listing.findMany({
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
        const response = {
            page: pageNumber,
            limit: limitNumber,
            data: listings.map((listing) => ({
                ...listing,
                photos: listing.photos.map((photo) => ({
                    ...photo,
                    optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 600, 400)
                }))
            }))
        };
        (0, cache_1.setCache)(cacheKey, response, 60);
        res.json(response);
    }
    catch (error) {
        next({ error, operation: "getAllListings" });
    }
};
exports.getAllListings = getAllListings;
const searchListings = async (req, res, next) => {
    try {
        const { location, type, minPrice, maxPrice, guests, page, limit } = req.query;
        const pageNumber = parsePositiveInt(page, 1);
        const limitNumber = parsePositiveInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;
        const where = {};
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
            prisma_1.default.listing.findMany({
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
            prisma_1.default.listing.count({ where })
        ]);
        res.json({
            data: listings.map((listing) => ({
                ...listing,
                photos: listing.photos.map((photo) => ({
                    ...photo,
                    optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 600, 400)
                }))
            })),
            meta: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        });
    }
    catch (error) {
        next({ error, operation: "searchListings" });
    }
};
exports.searchListings = searchListings;
const getListingById = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        const listing = await prisma_1.default.listing.findUnique({
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
                optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 900, 600)
            }))
        });
    }
    catch (error) {
        next({ error, operation: "getListingById" });
    }
};
exports.getListingById = getListingById;
const getListingStats = async (_req, res, next) => {
    try {
        const cacheKey = "listings:stats";
        const cached = (0, cache_1.getCache)(cacheKey);
        if (cached !== null) {
            res.json(cached);
            return;
        }
        const [total, avgPrice, byLocation, byType] = await Promise.all([
            prisma_1.default.listing.count(),
            prisma_1.default.listing.aggregate({
                _avg: { pricePerNight: true }
            }),
            prisma_1.default.listing.groupBy({
                by: ["location"],
                _count: true,
                _avg: { pricePerNight: true }
            }),
            prisma_1.default.listing.groupBy({
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
        (0, cache_1.setCache)(cacheKey, stats, 300);
        res.json(stats);
    }
    catch (error) {
        next({ error, operation: "getListingStats" });
    }
};
exports.getListingStats = getListingStats;
const createListing = async (req, res, next) => {
    try {
        const { title, description, location, pricePerNight, guests, type, amenities, rating } = req.body;
        if (!title ||
            !description ||
            !location ||
            pricePerNight === undefined ||
            guests === undefined ||
            type === undefined ||
            !Array.isArray(amenities)) {
            res.status(400).json({
                message: "Missing required fields: title, description, location, pricePerNight, guests, type, amenities"
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
        const listing = await prisma_1.default.listing.create({
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
        invalidateListingListCaches();
        invalidateListingStatsCache();
        res.status(201).json(listing);
    }
    catch (error) {
        next({ error, operation: "createListing" });
    }
};
exports.createListing = createListing;
const updateListing = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        const { title, description, location, pricePerNight, guests, type, amenities, rating, hostId } = req.body;
        if (type !== undefined && !isListingType(type)) {
            res.status(400).json({ message: "Invalid listing type" });
            return;
        }
        if (amenities !== undefined && !Array.isArray(amenities)) {
            res.status(400).json({ message: "Amenities must be an array of strings" });
            return;
        }
        const existing = await prisma_1.default.listing.findFirst({ where: { id } });
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
        const listing = await prisma_1.default.listing.update({
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
        invalidateListingListCaches();
        invalidateListingStatsCache();
        res.json(listing);
    }
    catch (error) {
        next({ error, operation: "updateListing" });
    }
};
exports.updateListing = updateListing;
const deleteListing = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        const existing = await prisma_1.default.listing.findFirst({ where: { id } });
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
        const deleted = await prisma_1.default.listing.delete({ where: { id } });
        invalidateListingListCaches();
        invalidateListingStatsCache();
        invalidateListingReviewCaches(id);
        res.json(deleted);
    }
    catch (error) {
        next({ error, operation: "deleteListing" });
    }
};
exports.deleteListing = deleteListing;
