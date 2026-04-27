import { Router } from "express";
import {
  createListing,
  deleteListing,
  getAllListings,
  getListingById,
  updateListing
} from "../controllers/listings.controller";
import { authenticate, requireHost } from "../middlewares/auth.middleware";

const listingsRouter = Router();

listingsRouter.get("/", getAllListings);
listingsRouter.get("/:id", getListingById);
listingsRouter.post("/", authenticate, requireHost, createListing);
listingsRouter.put("/:id", authenticate, updateListing);
listingsRouter.delete("/:id", authenticate, deleteListing);

export default listingsRouter;
