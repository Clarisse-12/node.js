import type { NextFunction, Request, Response } from "express";

export function deprecateV1(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "Sat, 01 Jan 2026 00:00:00 GMT");
  res.setHeader("Link", '</api/v2>; rel="successor-version"');
  next();
}