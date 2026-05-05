"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateReviewSummaryCache = exports.reviewSummary = exports.recommendListings = exports.guestChatbot = exports.generateListingDescription = exports.smartListingSearch = void 0;
const messages_1 = require("@langchain/core/messages");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const ai_1 = require("../config/ai");
const cache_1 = require("../config/cache");
const ids_1 = require("../utils/ids");
const chatSessions = new Map();
const listingTypeValues = new Set(Object.values(client_1.ListingType));
const trimText = (value) => value.replace(/\s+/g, " ").trim();
const extractJsonCandidate = (text) => {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced?.[1] ?? text;
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        return null;
    }
    return raw.slice(start, end + 1);
};
const parseJson = (text) => {
    const candidate = extractJsonCandidate(text);
    if (!candidate)
        return null;
    try {
        return JSON.parse(candidate);
    }
    catch {
        return null;
    }
};
const toListingType = (value) => {
    if (typeof value !== "string")
        return null;
    const upper = value.toUpperCase();
    return listingTypeValues.has(upper) ? upper : null;
};
const normalizeFilters = (candidate) => {
    return {
        location: typeof candidate?.location === "string" && candidate.location.trim() ? candidate.location.trim() : null,
        type: toListingType(candidate?.type),
        maxPrice: typeof candidate?.maxPrice === "number" && Number.isFinite(candidate.maxPrice) && candidate.maxPrice > 0
            ? candidate.maxPrice
            : null,
        guests: typeof candidate?.guests === "number" && Number.isInteger(candidate.guests) && candidate.guests > 0
            ? candidate.guests
            : null
    };
};
const hasAnyFilter = (filters) => {
    return Boolean(filters.location || filters.type || filters.maxPrice || filters.guests);
};
const extractFiltersHeuristically = (query) => {
    const lower = query.toLowerCase();
    let type = null;
    if (lower.includes("apartment"))
        type = client_1.ListingType.APARTMENT;
    else if (lower.includes("house"))
        type = client_1.ListingType.HOUSE;
    else if (lower.includes("villa"))
        type = client_1.ListingType.VILLA;
    else if (lower.includes("cabin"))
        type = client_1.ListingType.CABIN;
    const priceMatch = lower.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|for)\s*\$?(\d+(?:\.\d+)?)/i);
    const guestMatch = lower.match(/(\d+)\s*(?:guests?|people|persons?)/i);
    const locationMatch = query.match(/(?:in|near|around|at)\s+([A-Za-z][A-Za-z\s-]{1,40})/i);
    return normalizeFilters({
        location: locationMatch?.[1] ?? null,
        type,
        maxPrice: priceMatch ? Number(priceMatch[1]) : null,
        guests: guestMatch ? Number(guestMatch[1]) : null
    });
};
const extractFiltersFromQuery = async (query) => {
    const prompt = [
        new messages_1.SystemMessage("Extract listing search filters from the user's request. Return only valid JSON with keys location, type, maxPrice, guests. Use null for anything not explicitly mentioned. type must be one of APARTMENT, HOUSE, VILLA, CABIN, or null. Do not add commentary."),
        new messages_1.HumanMessage(query)
    ];
    try {
        const response = await ai_1.deterministicModel.invoke(prompt);
        const parsed = parseJson(typeof response.content === "string" ? response.content : String(response.content));
        return normalizeFilters(parsed);
    }
    catch {
        return extractFiltersHeuristically(query);
    }
};
const getGroqFailureResponse = (error) => {
    const candidate = error;
    const status = candidate?.status ?? candidate?.statusCode ?? candidate?.response?.status;
    const message = candidate?.message ?? "";
    if (status === 429) {
        return { status: 429, message: "AI service is busy, please try again in a moment" };
    }
    if (status === 401 || /api key|authentication|unauthorized/i.test(message)) {
        return { status: 500, message: "AI service configuration error" };
    }
    return null;
};
const sendGroqError = (error, res) => {
    const failure = getGroqFailureResponse(error);
    if (!failure) {
        return false;
    }
    res.status(failure.status).json({ message: failure.message });
    return true;
};
const formatBookingHistory = (bookings) => {
    return bookings
        .map((booking, index) => {
        return [
            `${index + 1}. ${booking.listing.title}`,
            `Location: ${booking.listing.location}`,
            `Type: ${booking.listing.type}`,
            `Price: $${booking.listing.pricePerNight}`,
            `Guests: ${booking.listing.guests}`,
            `Amenities: ${booking.listing.amenities.join(", ")}`,
            `Dates: ${booking.checkIn.toISOString().slice(0, 10)} to ${booking.checkOut.toISOString().slice(0, 10)}`,
            `Total: ${booking.totalPrice ?? "unknown"}`
        ].join("\n");
    })
        .join("\n\n");
};
const fallbackRecommendation = (bookings) => {
    const locationCounts = new Map();
    const typeCounts = new Map();
    let priceTotal = 0;
    let guestTotal = 0;
    bookings.forEach((booking) => {
        locationCounts.set(booking.listing.location, (locationCounts.get(booking.listing.location) ?? 0) + 1);
        typeCounts.set(booking.listing.type, (typeCounts.get(booking.listing.type) ?? 0) + 1);
        priceTotal += booking.listing.pricePerNight;
        guestTotal += booking.listing.guests;
    });
    const topLocation = Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topType = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const avgPrice = Math.max(1, Math.round(priceTotal / bookings.length));
    const avgGuests = Math.max(1, Math.round(guestTotal / bookings.length));
    return {
        preferences: `User tends to book ${topType ? topType.toLowerCase() : "similar"} stays${topLocation ? ` in ${topLocation}` : ""}, usually for about ${avgGuests} guests, around $${avgPrice}/night.`,
        searchFilters: {
            location: topLocation,
            type: topType,
            maxPrice: avgPrice,
            guests: avgGuests
        },
        reason: "Based on the user's recent bookings, these filters best match the most common location, property type, price, and guest count."
    };
};
const buildReviewThemes = (reviews) => {
    const positiveWords = new Map();
    const negativeWords = new Map();
    const tokenize = (text) => text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3);
    reviews.forEach((review) => {
        const words = tokenize(review.comment);
        words.forEach((word) => {
            if (["great", "clean", "quiet", "helpful", "responsive", "comfortable", "spacious", "amazing", "nice", "modern"].includes(word)) {
                positiveWords.set(word, (positiveWords.get(word) ?? 0) + 1);
            }
            if (["noise", "noisy", "dirty", "small", "slow", "cold", "hot", "issue", "problem", "bad", "weak"].includes(word)) {
                negativeWords.set(word, (negativeWords.get(word) ?? 0) + 1);
            }
        });
    });
    const positives = Array.from(positiveWords.entries()).sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, 3);
    const negatives = Array.from(negativeWords.entries()).sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, 3);
    const avg = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const summary = avg >= 4.5
        ? "Guests consistently had an excellent experience, with strong praise for the listing's overall comfort and convenience."
        : avg >= 3.5
            ? "Guests generally enjoyed their stay, with a few recurring areas mentioned for improvement."
            : "Guest feedback is mixed, with some positives but several repeated concerns worth addressing.";
    return {
        positives: positives.length ? positives : ["Comfortable stay", "Good value", "Positive guest experience"],
        negatives,
        summary
    };
};
const readAiText = (content) => {
    if (typeof content === "string")
        return content;
    if (Array.isArray(content))
        return content.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
    return String(content);
};
const buildListingSearchWhere = (filters) => {
    const where = {};
    if (filters.location) {
        where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.maxPrice !== null) {
        where.pricePerNight = { lte: filters.maxPrice };
    }
    if (filters.guests !== null) {
        where.guests = { gte: filters.guests };
    }
    return where;
};
const smartListingSearch = async (req, res, next) => {
    try {
        const query = String(req.body?.query ?? "").trim();
        if (!query) {
            res.status(400).json({ message: "Missing required fields: query" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const filters = await extractFiltersFromQuery(query);
        if (!hasAnyFilter(filters)) {
            res.status(400).json({ message: "Could not extract any filters from your query, please be more specific" });
            return;
        }
        const where = buildListingSearchWhere(filters);
        const [listings, total] = await Promise.all([
            prisma_1.default.listing.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    location: true,
                    pricePerNight: true,
                    guests: true,
                    type: true,
                    amenities: true,
                    rating: true,
                    host: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    photos: {
                        select: {
                            id: true,
                            url: true,
                            publicId: true
                        }
                    }
                }
            }),
            prisma_1.default.listing.count({ where })
        ]);
        res.json({
            filters,
            data: listings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        if (sendGroqError(error, res))
            return;
        next({ error, operation: "smartListingSearch" });
    }
};
exports.smartListingSearch = smartListingSearch;
const generateListingDescription = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const tone = String(req.body?.tone ?? "professional").trim().toLowerCase();
        if (!["professional", "casual", "luxury"].includes(tone)) {
            res.status(400).json({ message: 'tone must be one of "professional", "casual", or "luxury"' });
            return;
        }
        const listing = await prisma_1.default.listing.findUnique({
            where: { id },
            include: {
                host: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!listing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        if (listing.hostId !== req.userId) {
            res.status(403).json({ message: "You can only generate descriptions for your own listings" });
            return;
        }
        const toneInstructions = {
            professional: "formal, clear, business-like",
            casual: "friendly, relaxed, conversational",
            luxury: "elegant, premium, aspirational"
        }[tone];
        const prompt = [
            new messages_1.SystemMessage(`You write high-quality Airbnb listing descriptions. Use a ${toneInstructions} tone. Return only the description text, no bullets, no title, no markdown.`),
            new messages_1.HumanMessage(`Listing details:\nTitle: ${listing.title}\nLocation: ${listing.location}\nPrice per night: $${listing.pricePerNight}\nGuests: ${listing.guests}\nType: ${listing.type}\nAmenities: ${listing.amenities.join(", ")}\nCurrent description: ${listing.description}`)
        ];
        let generatedDescription = "";
        try {
            const response = await ai_1.model.invoke(prompt);
            generatedDescription = trimText(readAiText(response.content));
        }
        catch (error) {
            if (!sendGroqError(error, res)) {
                generatedDescription = "";
            }
            else {
                return;
            }
        }
        if (!generatedDescription) {
            const toneFallback = {
                professional: `This well-appointed ${listing.type.toLowerCase()} offers a polished stay in ${listing.location}. It features ${listing.amenities.join(", ")} and is designed for guests seeking comfort and convenience.`,
                casual: `This ${listing.type.toLowerCase()} in ${listing.location} is a great place to kick back and enjoy your stay. You’ll have ${listing.amenities.join(", ")} plus a space that feels easy and welcoming.`,
                luxury: `Experience a refined escape in this exquisite ${listing.type.toLowerCase()} in ${listing.location}. Thoughtfully curated details, ${listing.amenities.join(", ")}, and an elevated atmosphere create a truly memorable stay.`
            };
            generatedDescription = toneFallback[tone];
        }
        const updatedListing = await prisma_1.default.listing.update({
            where: { id },
            data: { description: generatedDescription }
        });
        res.json({ description: generatedDescription, listing: updatedListing });
    }
    catch (error) {
        if (sendGroqError(error, res))
            return;
        next({ error, operation: "generateListingDescription" });
    }
};
exports.generateListingDescription = generateListingDescription;
const guestChatbot = async (req, res, next) => {
    try {
        const sessionId = String(req.body?.sessionId ?? "").trim();
        const message = String(req.body?.message ?? "").trim();
        const listingIdRaw = req.body?.listingId;
        const listingId = typeof listingIdRaw === "string" && listingIdRaw.trim() ? listingIdRaw.trim() : null;
        if (!sessionId || !message) {
            res.status(400).json({ message: "Missing required fields: sessionId, message" });
            return;
        }
        let systemPrompt = "You are a helpful guest support assistant for an Airbnb-like platform.";
        if (listingId) {
            if (!(0, ids_1.isUuid)(listingId)) {
                res.status(400).json({ message: "Invalid listing id" });
                return;
            }
            const listing = await prisma_1.default.listing.findUnique({
                where: { id: listingId },
                select: {
                    title: true,
                    location: true,
                    pricePerNight: true,
                    guests: true,
                    type: true,
                    amenities: true,
                    description: true
                }
            });
            if (!listing) {
                res.status(404).json({ message: "Listing not found" });
                return;
            }
            systemPrompt = [
                "You are a helpful guest support assistant for an Airbnb-like platform.",
                "You are currently helping a guest with questions about this specific listing:",
                `Title: ${listing.title}`,
                `Location: ${listing.location}`,
                `Price per night: $${listing.pricePerNight}`,
                `Max guests: ${listing.guests}`,
                `Type: ${listing.type}`,
                `Amenities: ${listing.amenities.join(", ")}`,
                `Description: ${listing.description}`,
                "",
                "Answer questions about this listing accurately based on the details above.",
                "If asked something not covered by the listing details, say you don't have that information."
            ].join("\n");
        }
        const session = chatSessions.get(sessionId) ?? { messages: [] };
        const promptMessages = session.messages.slice(-20).map((entry) => entry.role === "user" ? new messages_1.HumanMessage(entry.content) : new messages_1.AIMessage(entry.content));
        const response = await ai_1.model.invoke([new messages_1.SystemMessage(systemPrompt), ...promptMessages, new messages_1.HumanMessage(message)]);
        const assistantReply = trimText(readAiText(response.content)) || "I’m sorry, I couldn’t generate a response right now.";
        const updatedMessages = [
            ...session.messages,
            { role: "user", content: message },
            { role: "assistant", content: assistantReply }
        ].slice(-20);
        chatSessions.set(sessionId, { messages: updatedMessages });
        res.json({
            response: assistantReply,
            sessionId,
            messageCount: updatedMessages.length
        });
    }
    catch (error) {
        if (sendGroqError(error, res))
            return;
        next({ error, operation: "guestChatbot" });
    }
};
exports.guestChatbot = guestChatbot;
const recommendListings = async (req, res, next) => {
    try {
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const bookings = await prisma_1.default.booking.findMany({
            where: { guestId: req.userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        location: true,
                        pricePerNight: true,
                        guests: true,
                        type: true,
                        amenities: true
                    }
                }
            }
        });
        if (!bookings.length) {
            res.status(400).json({ message: "No booking history found. Make some bookings first to get recommendations." });
            return;
        }
        const bookedListingIds = Array.from(new Set(bookings.map((booking) => booking.listing.id)));
        const historySummary = formatBookingHistory(bookings.map((booking) => ({
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalPrice: booking.totalPrice,
            listing: booking.listing
        })));
        let aiResult = null;
        try {
            const response = await ai_1.deterministicModel.invoke([
                new messages_1.SystemMessage("Analyze the booking history and return only JSON in this exact shape: {\"preferences\":\"string\",\"searchFilters\":{\"location\":string|null,\"type\":string|null,\"maxPrice\":number|null,\"guests\":number|null},\"reason\":\"string\"}. Use the history to infer realistic filters."),
                new messages_1.HumanMessage(`Booking history:\n${historySummary}`)
            ]);
            const parsed = parseJson(readAiText(response.content));
            if (parsed?.preferences && parsed?.reason && parsed?.searchFilters) {
                aiResult = {
                    preferences: parsed.preferences,
                    reason: parsed.reason,
                    searchFilters: normalizeFilters(parsed.searchFilters)
                };
            }
        }
        catch (error) {
            if (!sendGroqError(error, res)) {
                aiResult = null;
            }
            else {
                return;
            }
        }
        if (!aiResult) {
            aiResult = fallbackRecommendation(bookings.map((booking) => ({ listing: booking.listing })));
        }
        const where = {
            id: { notIn: bookedListingIds }
        };
        if (aiResult.searchFilters.location) {
            where.location = { contains: aiResult.searchFilters.location, mode: "insensitive" };
        }
        if (aiResult.searchFilters.type) {
            where.type = aiResult.searchFilters.type;
        }
        if (aiResult.searchFilters.maxPrice !== null) {
            where.pricePerNight = { lte: aiResult.searchFilters.maxPrice };
        }
        if (aiResult.searchFilters.guests !== null) {
            where.guests = { gte: aiResult.searchFilters.guests };
        }
        const recommendations = await prisma_1.default.listing.findMany({
            where,
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                location: true,
                pricePerNight: true,
                guests: true,
                type: true,
                amenities: true,
                host: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.json({
            preferences: aiResult.preferences,
            reason: aiResult.reason,
            searchFilters: aiResult.searchFilters,
            recommendations
        });
    }
    catch (error) {
        if (sendGroqError(error, res))
            return;
        next({ error, operation: "recommendListings" });
    }
};
exports.recommendListings = recommendListings;
const reviewSummary = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        const cacheKey = `ai:review-summary:${id}`;
        const cached = (0, cache_1.getCache)(cacheKey);
        if (cached !== null) {
            res.json(cached);
            return;
        }
        const [listing, reviews] = await Promise.all([
            prisma_1.default.listing.findUnique({
                where: { id },
                select: {
                    id: true
                }
            }),
            prisma_1.default.review.findMany({
                where: { listingId: id },
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            })
        ]);
        if (!listing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        if (reviews.length < 3) {
            res.status(400).json({ message: "Not enough reviews to generate a summary (minimum 3 required)" });
            return;
        }
        const averageRating = Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10;
        const reviewText = reviews
            .map((review, index) => `${index + 1}. ${review.user.name} rated ${review.rating}/5: ${review.comment}`)
            .join("\n");
        let generated = null;
        try {
            const response = await ai_1.deterministicModel.invoke([
                new messages_1.SystemMessage("Read the guest reviews and return only JSON with keys summary, positives, negatives. summary must be 2-3 sentences. positives and negatives must be arrays of short phrases. Do not calculate the average rating; it is provided separately."),
                new messages_1.HumanMessage(`Reviews for listing ${id}:\n${reviewText}`)
            ]);
            generated = parseJson(readAiText(response.content));
        }
        catch (error) {
            if (!sendGroqError(error, res)) {
                generated = null;
            }
            else {
                return;
            }
        }
        if (!generated) {
            generated = buildReviewThemes(reviews);
        }
        const payload = {
            summary: trimText(generated.summary),
            positives: generated.positives.slice(0, 3),
            negatives: generated.negatives,
            averageRating,
            totalReviews: reviews.length
        };
        (0, cache_1.setCache)(cacheKey, payload, 600);
        res.json(payload);
    }
    catch (error) {
        if (sendGroqError(error, res))
            return;
        next({ error, operation: "reviewSummary" });
    }
};
exports.reviewSummary = reviewSummary;
const invalidateReviewSummaryCache = (listingId) => {
    (0, cache_1.invalidateCache)(`ai:review-summary:${listingId}`);
};
exports.invalidateReviewSummaryCache = invalidateReviewSummaryCache;
