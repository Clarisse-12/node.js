import type { NextFunction, Response } from "express";
import { deleteFromCloudinary, getOptimizedUrl, uploadToCloudinary } from "../config/cloudinary.js";
import prisma from "../config/prisma.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { isUuid } from "../utils/ids";

const sanitizeUser = <T extends Record<string, unknown>>(user: T): T => {
  const safeUser = { ...user } as Record<string, unknown>;
  delete safeUser.password;
  delete safeUser.resetToken;
  delete safeUser.resetTokenExpiry;
  return safeUser as T;
};

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"];

    if (!isUuid(id)) {
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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "airbnb/avatars");

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        avatar: url,
        avatarPublicId: publicId
      }
    });

    res.json({ message: "Avatar uploaded successfully", user: sanitizeUser(updatedUser) });
  } catch (error) {
    next({ error, operation: "uploadAvatar" });
  }
}

export async function deleteAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"];

    if (!isUuid(id)) {
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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.avatar || !user.avatarPublicId) {
      res.status(400).json({ message: "No avatar to remove" });
      return;
    }

    await deleteFromCloudinary(user.avatarPublicId);

    await prisma.user.update({
      where: { id },
      data: {
        avatar: null,
        avatarPublicId: null
      }
    });

    res.json({ message: "Avatar removed successfully" });
  } catch (error) {
    next({ error, operation: "deleteAvatar" });
  }
}

export async function uploadListingPhotos(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"];

    if (!isUuid(id)) {
      res.status(400).json({ message: "Invalid listing id" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only upload photos to your own listing" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({ where: { listingId: id } });
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
      const { url, publicId } = await uploadToCloudinary(file.buffer, "airbnb/listings");

      await prisma.listingPhoto.create({
        data: {
          listingId: id,
          url,
          publicId
        }
      });
    }

    const updatedListing = await prisma.listing.findUnique({
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
        optimizedUrl: getOptimizedUrl(photo.url, 900, 600)
      }))
    });
  } catch (error) {
    next({ error, operation: "uploadListingPhotos" });
  }
}

export async function deleteListingPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params["id"];
    const photoId = req.params["photoId"];

    if (!isUuid(id) || !isUuid(photoId)) {
      res.status(400).json({ message: "Invalid id parameter" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "You can only delete photos from your own listing" });
      return;
    }

    const photo = await prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ message: "Photo not found" });
      return;
    }

    if (photo.listingId !== id) {
      res.status(403).json({ message: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.json({ message: "Listing photo deleted successfully" });
  } catch (error) {
    next({ error, operation: "deleteListingPhoto" });
  }
}