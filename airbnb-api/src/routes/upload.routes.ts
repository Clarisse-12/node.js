import { Router } from "express";
import upload from "../config/multer.js";
import {
  deleteAvatar,
  deleteListingPhoto,
  uploadAvatar,
  uploadListingPhotos
} from "../controllers/upload.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const uploadRouter = Router();

uploadRouter.post("/users/:id/avatar", authenticate, upload.single("image"), uploadAvatar);
uploadRouter.delete("/users/:id/avatar", authenticate, deleteAvatar);

uploadRouter.post("/listings/:id/photos", authenticate, upload.array("photos", 5), uploadListingPhotos);
uploadRouter.delete("/listings/:id/photos/:photoId", authenticate, deleteListingPhoto);

export default uploadRouter;
