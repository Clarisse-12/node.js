import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  register,
  resetPassword
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, getMe);
authRouter.post("/change-password", authenticate, changePassword);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password/:token", resetPassword);

export default authRouter;