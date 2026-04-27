import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

type OperationError = {
  error: unknown;
  operation?: string;
};

const resolvePayload = (err: unknown): OperationError => {
  if (typeof err === "object" && err !== null && "error" in err) {
    return err as OperationError;
  }

  return { error: err };
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const payload = resolvePayload(err);
  const operation = payload.operation ?? "unknown";
  const actualError = payload.error;

  if (actualError instanceof Prisma.PrismaClientKnownRequestError) {
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

  if (actualError instanceof Error) {
    console.error("Unhandled operation failed", {
      operation,
      message: actualError.message
    });
  } else {
    console.error("Unhandled operation failed", {
      operation,
      error: actualError
    });
  }

  res.status(500).json({ message: "Something went wrong" });
};