import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
    chat,
  generateListingDescription,

  naturalLanguageSearch,

} from "../../controllers/ai.controller";

const aiRouter = Router();


/**
 * @swagger
 * components:
 *   schemas:
 *     AiSearchInput:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           example: Find a villa in Miami for 4 guests under 300 dollars
 *     AiSearchResponse:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *         extractedfilters:
 *           type: object
 *           properties:
 *             location:
 *               type: string
 *             type:
 *               type: string
 *               enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *             guests:
 *               type: number
 *             maxPrice:
 *               type: number
 *         results:
 *           type: array
 *           items:
 *             type: object
 *         count:
 *           type: integer
 *     AiDescriptionInput:
 *       type: object
 *       required:
 *         - title
 *         - location
 *         - type
 *         - guests
 *         - amenities
 *         - pricePerNight
 *       properties:
 *         title:
 *           type: string
 *         location:
 *           type: string
 *         type:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *         guests:
 *           type: integer
 *         amenities:
 *           oneOf:
 *             - type: array
 *               items:
 *                 type: string
 *             - type: string
 *         pricePerNight:
 *           type: number
 *     AiDescriptionResponse:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *     AiChatInput:
 *       type: object
 *       required:
 *         - message
 *         - sessionId
 *       properties:
 *         message:
 *           type: string
 *         sessionId:
 *           type: string
 *     AiChatResponse:
 *       type: object
 *       properties:
 *         reply:
 *           type: string
 *         sessionId:
 *           type: string
 */

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
aiRouter.post("/search",naturalLanguageSearch);
/**
 * @swagger
 * /ai/description:
 *   post:
 *     summary: Generate an Airbnb listing description
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiDescriptionInput'
 *     responses:
 *       200:
 *         description: Description generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiDescriptionResponse'
 *       400:
 *         description: Missing required fields

 */
aiRouter.post("/description",generateListingDescription);

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
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat reply
 */
aiRouter.post("/chat", chat);

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
export default aiRouter;