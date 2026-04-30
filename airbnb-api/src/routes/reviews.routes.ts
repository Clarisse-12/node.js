import { Router } from "express";
import { createReview, getListingReviews, deleteReview } from "../controllers/reviews.controller";
import { authenticate } from "../middlewares/auth.middleware";

const reviewsRouter = Router();

/**
 * @swagger
 * /listings/{id}/reviews:
 *   post:
 *     summary: Create a new review for a listing
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
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
 *               userId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Invalid rating or missing fields
 *       404:
 *         description: Listing not found
 */
reviewsRouter.post("/listings/:id/reviews", authenticate, createReview);

/**
 * @swagger
 * /listings/{id}/reviews:
 *   get:
 *     summary: Get paginated reviews for a listing
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: Reviews with pagination
 */
reviewsRouter.get("/listings/:id/reviews", getListingReviews);

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review deleted
 *       404:
 *         description: Review not found
 */
reviewsRouter.delete("/reviews/:id", authenticate, deleteReview);

export default reviewsRouter;
