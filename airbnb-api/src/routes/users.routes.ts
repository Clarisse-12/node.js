import { Router } from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserBookings,
  getUserById,
  getUserListings,
  updateUser
} from "../controllers/users.controller";

const usersRouter = Router();

usersRouter.get("/", getAllUsers);
usersRouter.get("/:id", getUserById);
usersRouter.get("/:id/listings", getUserListings);
usersRouter.get("/:id/bookings", getUserBookings);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);

export default usersRouter;
