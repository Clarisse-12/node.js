"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.deleteAvatar = deleteAvatar;
exports.uploadListingPhotos = uploadListingPhotos;
exports.deleteListingPhoto = deleteListingPhoto;
const cloudinary_js_1 = require("../config/cloudinary.js");
const prisma_js_1 = __importDefault(require("../config/prisma.js"));
const ids_1 = require("../utils/ids");
const sanitizeUser = (user) => {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpiry;
    return safeUser;
};
async function uploadAvatar(req, res, next) {
    try {
        const id = req.params["id"];
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        if (req.userId !== id) {
            res.status(403).json({ message: "You can only update your own avatar" });
            return;
        }
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (user.avatarPublicId) {
            await (0, cloudinary_js_1.deleteFromCloudinary)(user.avatarPublicId);
        }
        const { url, publicId } = await (0, cloudinary_js_1.uploadToCloudinary)(req.file.buffer, "airbnb/avatars");
        const updatedUser = await prisma_js_1.default.user.update({
            where: { id },
            data: {
                avatar: url,
                avatarPublicId: publicId
            }
        });
        res.json({ message: "Avatar uploaded successfully", user: sanitizeUser(updatedUser) });
    }
    catch (error) {
        next({ error, operation: "uploadAvatar" });
    }
}
async function deleteAvatar(req, res, next) {
    try {
        const id = req.params["id"];
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid user id" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        if (req.userId !== id) {
            res.status(403).json({ message: "You can only delete your own avatar" });
            return;
        }
        const user = await prisma_js_1.default.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (!user.avatar || !user.avatarPublicId) {
            res.status(400).json({ message: "No avatar to remove" });
            return;
        }
        await (0, cloudinary_js_1.deleteFromCloudinary)(user.avatarPublicId);
        await prisma_js_1.default.user.update({
            where: { id },
            data: {
                avatar: null,
                avatarPublicId: null
            }
        });
        res.json({ message: "Avatar removed successfully" });
    }
    catch (error) {
        next({ error, operation: "deleteAvatar" });
    }
}
async function uploadListingPhotos(req, res, next) {
    try {
        const id = req.params["id"];
        if (!(0, ids_1.isUuid)(id)) {
            res.status(400).json({ message: "Invalid listing id" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const listing = await prisma_js_1.default.listing.findUnique({ where: { id } });
        if (!listing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        if (listing.hostId !== req.userId) {
            res.status(403).json({ message: "You can only upload photos to your own listing" });
            return;
        }
        const existingCount = await prisma_js_1.default.listingPhoto.count({ where: { listingId: id } });
        if (existingCount >= 5) {
            res.status(400).json({ message: "Maximum of 5 photos allowed per listing" });
            return;
        }
        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            res.status(400).json({ message: "No photos uploaded" });
            return;
        }
        const remainingSlots = 5 - existingCount;
        const filesToProcess = files.slice(0, remainingSlots);
        for (const file of filesToProcess) {
            const { url, publicId } = await (0, cloudinary_js_1.uploadToCloudinary)(file.buffer, "airbnb/listings");
            await prisma_js_1.default.listingPhoto.create({
                data: {
                    listingId: id,
                    url,
                    publicId
                }
            });
        }
        const updatedListing = await prisma_js_1.default.listing.findUnique({
            where: { id },
            include: {
                photos: true
            }
        });
        if (!updatedListing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        res.json({
            ...updatedListing,
            photos: updatedListing.photos.map((photo) => ({
                ...photo,
                optimizedUrl: (0, cloudinary_js_1.getOptimizedUrl)(photo.url, 900, 600)
            }))
        });
    }
    catch (error) {
        next({ error, operation: "uploadListingPhotos" });
    }
}
async function deleteListingPhoto(req, res, next) {
    try {
        const id = req.params["id"];
        const photoId = req.params["photoId"];
        if (!(0, ids_1.isUuid)(id) || !(0, ids_1.isUuid)(photoId)) {
            res.status(400).json({ message: "Invalid id parameter" });
            return;
        }
        if (!req.userId) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        const listing = await prisma_js_1.default.listing.findUnique({ where: { id } });
        if (!listing) {
            res.status(404).json({ message: "Listing not found" });
            return;
        }
        if (listing.hostId !== req.userId) {
            res.status(403).json({ message: "You can only delete photos from your own listing" });
            return;
        }
        const photo = await prisma_js_1.default.listingPhoto.findUnique({ where: { id: photoId } });
        if (!photo) {
            res.status(404).json({ message: "Photo not found" });
            return;
        }
        if (photo.listingId !== id) {
            res.status(403).json({ message: "Photo does not belong to this listing" });
            return;
        }
        await (0, cloudinary_js_1.deleteFromCloudinary)(photo.publicId);
        await prisma_js_1.default.listingPhoto.delete({ where: { id: photoId } });
        res.json({ message: "Listing photo deleted successfully" });
    }
    catch (error) {
        next({ error, operation: "deleteListingPhoto" });
    }
}
