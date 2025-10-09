import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();

  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader) {
    return res.status(403).json({ error: "Missing CSRF token" });
  }

  // Timing-safe comparison
  const cookieBuf = Buffer.from(csrfCookie);
  const headerBuf = Buffer.from(csrfHeader as string);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};
