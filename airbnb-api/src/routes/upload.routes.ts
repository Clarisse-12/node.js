import { Router } from "express";
import upload from "../config/multer.js";
import {
  deleteAvatar,
  deleteListingPhoto,
  uploadAvatar,
  uploadListingPhotos
} from "../controllers/upload.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

/**
 * @swagger
 * /users/{id}/avatar:
 *   post:
 *     tags: [Upload]
 *     summary: Upload user avatar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User id (must match authenticated user)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpeg, png, webp, max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: No file uploaded or invalid type
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
 *       403:
 *         description: Cannot update another user avatar
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
 *     tags: [Upload]
 *     summary: Remove user avatar
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
 *         description: Avatar removed successfully
 *       400:
 *         description: No avatar to remove
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
 *       403:
 *         description: Cannot delete another user avatar
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
 * /listings/{id}/photos:
 *   post:
 *     tags: [Upload]
 *     summary: Upload listing photos
 *     description: Upload up to 5 photos per listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Listing id
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photos]
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (up to 5, jpeg/png/webp, max 5MB each)
 *     responses:
 *       201:
 *         description: Photos uploaded successfully
 *       400:
 *         description: No photos or max 5 photos reached
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
 *       403:
 *         description: Not the listing host
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
 *     tags: [Upload]
 *     summary: Delete listing photo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Listing id
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Photo id
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the listing host or photo does not belong to listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing or photo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const uploadRouter = Router();

uploadRouter.post("/users/:id/avatar", authenticate, upload.single("image"), uploadAvatar);
uploadRouter.delete("/users/:id/avatar", authenticate, deleteAvatar);

uploadRouter.post("/listings/:id/photos", authenticate, upload.array("photos", 5), uploadListingPhotos);
uploadRouter.delete("/listings/:id/photos/:photoId", authenticate, deleteListingPhoto);

export default uploadRouter;
