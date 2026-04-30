import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import compression from "compression";
import { connectDB } from "./config/prisma";
import authRouter from "./routes/auth.routes";
import { errorHandler } from "./middlewares/error.middleware";
import bookingsRouter from "./routes/bookings.routes";
import listingsRouter from "./routes/listings.routes";
import usersRouter from "./routes/users.routes";
import uploadRouter from "./routes/upload.routes.js";
import reviewsRouter from "./routes/reviews.routes";
import { setupSwagger } from "./config/swagger.js";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";

const app = express();
const PORT = Number(process.env["PORT"] ?? 3000);

app.use(express.json());
app.use(compression());
app.use(generalLimiter);
setupSwagger(app);

const frontendPublicPath = path.join(process.cwd(), "frontend", "public");
const frontendDistPath = path.join(process.cwd(), "frontend", "dist");

app.use("/app", express.static(frontendPublicPath));
app.use("/app/assets", express.static(frontendDistPath));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/listings", listingsRouter);
app.use("/bookings", bookingsRouter);
app.use("/", reviewsRouter);
app.use("/", uploadRouter);

// app.use("*", (_req: Request, res: Response) => {
//   res.status(404).json({ message: "Route not found" });
// });

app.use(errorHandler);

async function main() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error("Startup failed", error);
  process.exit(1);
});
