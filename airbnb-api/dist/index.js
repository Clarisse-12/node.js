"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("./config/prisma");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const bookings_routes_1 = __importDefault(require("./routes/bookings.routes"));
const listings_routes_1 = __importDefault(require("./routes/listings.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const upload_routes_js_1 = __importDefault(require("./routes/upload.routes.js"));
const app = (0, express_1.default)();
const PORT = Number(process.env["PORT"] ?? 3000);
app.use(express_1.default.json());
const frontendPublicPath = path_1.default.join(process.cwd(), "frontend", "public");
const frontendDistPath = path_1.default.join(process.cwd(), "frontend", "dist");
app.use("/app", express_1.default.static(frontendPublicPath));
app.use("/app/assets", express_1.default.static(frontendDistPath));
app.use("/auth", auth_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/listings", listings_routes_1.default);
app.use("/bookings", bookings_routes_1.default);
app.use("/", upload_routes_js_1.default);
// app.use("*", (_req: Request, res: Response) => {
//   res.status(404).json({ message: "Route not found" });
// });
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
