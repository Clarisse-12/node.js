import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const options: swaggerJsdoc.Options = {
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

const swaggerSpec = swaggerJsdoc(options);

// setupSwagger mounts the Swagger UI at /api-docs
// Call this in index.ts after setting up middleware
export function setupSwagger(app: Express) {
  // Serve the interactive Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Also expose the raw OpenAPI JSON spec
  // Useful for importing into Postman or generating client SDKs
  app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec);
  });

  console.log("Swagger docs available at http://localhost:3000/api-docs");
}