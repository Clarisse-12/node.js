"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const prisma_1 = require("./config/prisma");
const index_js_1 = __importDefault(require("./routes/v1/index.js"));
const swagger_js_1 = require("./config/swagger.js");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const deprecation_middleware_1 = require("./middlewares/deprecation.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
const PORT = Number(process.env["PORT"]) || 3000;
app.use(process.env["NODE_ENV"] === "production" ? (0, morgan_1.default)("combined") : (0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use((0, compression_1.default)());
app.use(rateLimiter_1.generalLimiter);
app.use((req, res, next) => {
    if (req.method === "POST") {
        return (0, rateLimiter_1.strictLimiter)(req, res, next);
    }
    return next();
});
(0, swagger_js_1.setupSwagger)(app);
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date()
    });
});
const frontendPublicPath = path_1.default.join(process.cwd(), "frontend", "public");
const frontendDistPath = path_1.default.join(process.cwd(), "frontend", "dist");
app.use("/app", express_1.default.static(frontendPublicPath));
app.use("/app/assets", express_1.default.static(frontendDistPath));
app.use("/api/v1", deprecation_middleware_1.deprecateV1, index_js_1.default);
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
app.use(error_middleware_1.errorHandler);
async function main() {
    await (0, prisma_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
main().catch((error) => {
    console.error("Startup failed", error);
    process.exit(1);
});
