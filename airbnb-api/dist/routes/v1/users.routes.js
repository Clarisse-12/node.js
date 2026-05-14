"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../../controllers/users.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Users fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags: [Users]
 *     summary: Create user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by id
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
 *         description: User fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Users]
 *     summary: Update user
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               phone:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Users]
 *     summary: Delete user
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
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /users/{id}/listings:
 *   get:
 *     tags: [Users]
 *     summary: Get user listings
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
 *         description: User listings fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /users/{id}/bookings:
 *   get:
 *     tags: [Users]
 *     summary: Get user bookings
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
 *         description: User bookings fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Kevin Cyiza
 *         email:
 *           type: string
 *           example: kevin@example.com
 *         username:
 *           type: string
 *           example: kevincyiza
 *         phone:
 *           type: string
 *           example: +250788123456
 *         role:
 *           type: string
 *           enum: [host, guest]
 *           example: guest
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: https://res.cloudinary.com/demo/image/upload/v1/airbnb/avatars/u1.jpg
 *         bio:
 *           type: string
 *           nullable: true
 *           example: I love travel and hosting.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-04-28T10:00:00.000Z
 *     Listing:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         title:
 *           type: string
 *           example: Cozy Lake Cabin
 *         description:
 *           type: string
 *           example: Quiet cabin with mountain view.
 *         location:
 *           type: string
 *           example: Kigali
 *         pricePerNight:
 *           type: number
 *           example: 120
 *         guests:
 *           type: integer
 *           example: 4
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *           example: cabin
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen, Parking]
 *         rating:
 *           type: number
 *           nullable: true
 *           example: 4.7
 *         userId:
 *           type: integer
 *           example: 1
 *         host:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-04-28T10:00:00.000Z
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 100
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: 2026-05-10T00:00:00.000Z
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: 2026-05-15T00:00:00.000Z
 *         total:
 *           type: number
 *           example: 600
 *         status:
 *           type: string
 *           enum: [confirmed, cancelled]
 *           example: confirmed
 *         userId:
 *           type: integer
 *           example: 1
 *         listingId:
 *           type: integer
 *           example: 10
 *         user:
 *           $ref: '#/components/schemas/User'
 *         listing:
 *           $ref: '#/components/schemas/Listing'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-04-28T10:00:00.000Z
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 50
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: Great stay and very clean place.
 *         userId:
 *           type: integer
 *           example: 1
 *         listingId:
 *           type: integer
 *           example: 10
 *         user:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-04-28T10:00:00.000Z
 *     RegisterInput:
 *       type: object
 *       required: [name, email, username, phone, password, role]
 *       properties:
 *         name:
 *           type: string
 *           example: Kevin Cyiza
 *         email:
 *           type: string
 *           example: kevin@example.com
 *         username:
 *           type: string
 *           example: kevincyiza
 *         phone:
 *           type: string
 *           example: +250788123456
 *         password:
 *           type: string
 *           example: Kevin@2026
 *         role:
 *           type: string
 *           enum: [host, guest]
 *           example: host
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           example: kevin@example.com
 *         password:
 *           type: string
 *           example: Kevin@2026
 *     CreateListingInput:
 *       type: object
 *       required: [title, description, location, pricePerNight, guests, type, amenities]
 *       properties:
 *         title:
 *           type: string
 *           example: City Apartment
 *         description:
 *           type: string
 *           example: Modern apartment near downtown.
 *         location:
 *           type: string
 *           example: Nairobi
 *         pricePerNight:
 *           type: number
 *           example: 90
 *         guests:
 *           type: integer
 *           example: 2
 *         type:
 *           type: string
 *           enum: [apartment, house, villa, cabin]
 *           example: apartment
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Air Conditioning]
 *     CreateBookingInput:
 *       type: object
 *       required: [listingId, userId, checkIn, checkOut]
 *       properties:
 *         listingId:
 *           type: integer
 *           example: 10
 *         userId:
 *           type: integer
 *           example: 1
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: 2026-05-10T00:00:00.000Z
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: 2026-05-15T00:00:00.000Z
 *     CreateReviewInput:
 *       type: object
 *       required: [userId, rating, comment]
 *       properties:
 *         userId:
 *           type: integer
 *           example: 1
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *         comment:
 *           type: string
 *           example: Amazing host and location.
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Resource not found
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample
 *         user:
 *           $ref: '#/components/schemas/User'
 */
const usersRouter = (0, express_1.Router)();
usersRouter.get("/stats", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, users_controller_1.getUserStats);
usersRouter.get("/", auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, users_controller_1.getAllUsers);
// Host request management
usersRouter.get("/host-requests", auth_middleware_1.authenticate, auth_middleware_1.requireHost, users_controller_1.listHostRequests);
usersRouter.patch("/host-requests/:requestId", auth_middleware_1.authenticate, auth_middleware_1.requireHost, users_controller_1.handleHostRequest);
usersRouter.post("/", users_controller_1.createUser);
// Request to become host (authenticated user)
usersRouter.post("/:id/request-host", auth_middleware_1.authenticate, users_controller_1.requestHost);
usersRouter.get("/:id", auth_middleware_1.authenticate, users_controller_1.getUserById);
usersRouter.get("/:id/listings", auth_middleware_1.authenticate, users_controller_1.getUserListings);
usersRouter.get("/:id/bookings", auth_middleware_1.authenticate, users_controller_1.getUserBookings);
usersRouter.put("/:id", auth_middleware_1.authenticate, users_controller_1.updateUser);
usersRouter.delete("/:id", auth_middleware_1.authenticate, users_controller_1.deleteUser);
exports.default = usersRouter;
