"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const listings_controller_1 = require("../controllers/listings.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
/**
 * @swagger
 * /listings:
 *   get:
 *     tags: [Listings]
 *     summary: Get all listings
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
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listings fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *   post:
 *     tags: [Listings]
 *     summary: Create listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateListingInput'
 *     responses:
 *       201:
 *         description: Listing created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get listing by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Listings]
 *     summary: Update listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               pricePerNight:
 *                 type: number
 *               guests:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [apartment, house, villa, cabin]
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Listing updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Listings]
 *     summary: Delete listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /listings/stats:
 *   get:
 *     tags: [Listings]
 *     summary: Get listing statistics by location
 *     responses:
 *       200:
 *         description: Listing statistics fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                   total:
 *                     type: integer
 *                   avg_price:
 *                     type: string
 *                   min_price:
 *                     type: number
 *                   max_price:
 *                     type: number
 */
const listingsRouter = (0, express_1.Router)();
listingsRouter.get("/", listings_controller_1.getAllListings);
listingsRouter.get("/search", listings_controller_1.searchListings);
listingsRouter.get("/stats", listings_controller_1.getListingStats);
listingsRouter.get("/:id", listings_controller_1.getListingById);
listingsRouter.post("/", auth_middleware_1.authenticate, auth_middleware_1.requireHost, listings_controller_1.createListing);
listingsRouter.put("/:id", auth_middleware_1.authenticate, listings_controller_1.updateListing);
listingsRouter.delete("/:id", auth_middleware_1.authenticate, listings_controller_1.deleteListing);
exports.default = listingsRouter;
