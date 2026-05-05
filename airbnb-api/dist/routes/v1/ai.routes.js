"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const ai_controller_1 = require("../../controllers/ai.controller");
const aiRouter = (0, express_1.Router)();
/**
 * @swagger
 * /ai/search:
 *   post:
 *     tags: [AI]
 *     summary: Smart listing search with AI filter extraction
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: apartment in Kigali under $100 for 2 guests
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing or vague query
 */
aiRouter.post("/search", ai_controller_1.smartListingSearch);
/**
 * @swagger
 * /ai/listings/{id}/generate-description:
 *   post:
 *     tags: [AI]
 *     summary: Generate a listing description using AI
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *     responses:
 *       200:
 *         description: Description generated
 */
aiRouter.post("/listings/:id/generate-description", auth_middleware_1.authenticate, ai_controller_1.generateListingDescription);
/**
 * @swagger
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Guest support chatbot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, message]
 *             properties:
 *               sessionId:
 *                 type: string
 *               listingId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat reply
 */
aiRouter.post("/chat", ai_controller_1.guestChatbot);
/**
 * @swagger
 * /ai/recommend:
 *   post:
 *     tags: [AI]
 *     summary: Booking-based listing recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations generated
 */
aiRouter.post("/recommend", auth_middleware_1.authenticate, ai_controller_1.recommendListings);
/**
 * @swagger
 * /ai/listings/{id}/review-summary:
 *   get:
 *     tags: [AI]
 *     summary: AI summary of listing reviews
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review summary generated
 */
aiRouter.get("/listings/:id/review-summary", ai_controller_1.reviewSummary);
exports.default = aiRouter;
