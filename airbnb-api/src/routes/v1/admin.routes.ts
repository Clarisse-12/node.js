import { Router } from "express";
import { deleteUser, getBookings, getListings, getMonthlyStats, getOverview, getUsers, setUserStatus } from "../../controllers/admin.controller";
import { authenticate, requireAdmin } from "../../middlewares/auth.middleware";

const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/overview", getOverview);
adminRouter.get("/monthly-stats", getMonthlyStats);
adminRouter.get("/users", getUsers);
adminRouter.patch("/users/:id/status", setUserStatus);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.get("/listings", getListings);
adminRouter.get("/bookings", getBookings);

export default adminRouter;