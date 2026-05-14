import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import compression from "compression";
import morgan from "morgan";
import { connectDB } from "./config/prisma";
import v1Router from "./routes/v1/index.js";
import { setupSwagger } from "./config/swagger.js";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { deprecateV1 } from "./middlewares/deprecation.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import cors from "cors";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

app.use(cors());
app.use(process.env["NODE_ENV"] === "production" ? morgan("combined") : morgan("dev"));

app.use(express.json());
app.use(compression());
app.use(generalLimiter);
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "POST") {
    return strictLimiter(req, res, next);
  }

  return next();
});
setupSwagger(app);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

const frontendPublicPath = path.join(process.cwd(), "frontend", "public");
const frontendDistPath = path.join(process.cwd(), "frontend", "dist");

app.use("/app", express.static(frontendPublicPath));
app.use("/app/assets", express.static(frontendDistPath));

app.use("/api/v1", deprecateV1, v1Router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

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
