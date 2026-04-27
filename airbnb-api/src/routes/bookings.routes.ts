import { Router } from "express";
import {
  createBooking,
  deleteBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
} from "../controllers/bookings.controller";
import { authenticate, requireGuest } from "../middlewares/auth.middleware";

const bookingsRouter = Router();

bookingsRouter.get("/", getAllBookings);
bookingsRouter.get("/:id", getBookingById);
bookingsRouter.post("/", authenticate, requireGuest, createBooking);
bookingsRouter.delete("/:id", authenticate, deleteBooking);
bookingsRouter.put("/:id", authenticate, updateBookingStatus);

export default bookingsRouter;