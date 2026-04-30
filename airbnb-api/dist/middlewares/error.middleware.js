"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const resolvePayload = (err) => {
    if (typeof err === "object" && err !== null && "error" in err) {
        return err;
    }
    return { error: err };
};
const errorHandler = (err, _req, res, _next) => {
    const payload = resolvePayload(err);
    const operation = payload.operation ?? "unknown";
    const actualError = payload.error;
    if (actualError instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        console.error("Prisma operation failed", {
            operation,
            code: actualError.code,
            message: actualError.message
        });
        if (actualError.code === "P2002") {
            res.status(409).json({ message: "A record with that unique field already exists" });
            return;
        }
        if (actualError.code === "P2025") {
            res.status(404).json({ message: "Record not found" });
            return;
        }
        if (actualError.code === "P2003") {
            res.status(400).json({ message: "Invalid foreign key reference" });
            return;
        }
    }
    if (actualError === undefined) {
        console.error(`Unhandled operation failed (${operation}): error is undefined`);
    }
    else if (actualError instanceof Error) {
        console.error("Unhandled operation failed", {
            operation,
            message: actualError.message,
            stack: actualError.stack
        });
    }
    else {
        // Log non-Error payloads as JSON for clarity
        let payloadStr;
        try {
            payloadStr = JSON.stringify(actualError);
        }
        catch {
            payloadStr = String(actualError);
        }
        console.error(`Unhandled operation failed (${operation}): ${payloadStr}`);
    }
    res.status(500).json({ message: "Something went wrong" });
};
exports.errorHandler = errorHandler;
