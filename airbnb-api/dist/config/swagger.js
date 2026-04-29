"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Airbnb API",
            version: "1.0.0",
            description: "REST API for Airbnb listings, users, and authentication",
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development server",
            },
        ],
        components: {
            // Define the Bearer token security scheme
            // This adds an "Authorize" button to the Swagger UI
            // where you can paste your JWT token once and it's sent with all requests
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    // Tell swagger-jsdoc where to find the JSDoc comments
    // It scans these files for @swagger annotations
    apis: ["./src/routes/*.ts"],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
// setupSwagger mounts the Swagger UI at /api-docs
// Call this in index.ts after setting up middleware
function setupSwagger(app) {
    // Serve the interactive Swagger UI
    app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
    // Also expose the raw OpenAPI JSON spec
    // Useful for importing into Postman or generating client SDKs
    app.get("/api-docs.json", (req, res) => {
        res.json(swaggerSpec);
    });
    console.log("Swagger docs available at http://localhost:3000/api-docs");
}
