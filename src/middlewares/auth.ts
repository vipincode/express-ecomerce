import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from "../utils/jwt";
import { User } from "../models/user.model";
import { setTokenCookie } from "../utils/cookies";
import { verifyCsrfToken } from "./csrf";
import { JWTExpired, JWTInvalid } from "jose/errors"; // ✅ jose error classes

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    req.user = payload;
    return verifyCsrfToken(req, res, next);
  } catch (err) {
    if (err instanceof JWTExpired) {
      // ✅ Handle expired token (try refresh)
      if (!refreshToken) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }

      try {
        const refreshPayload = await verifyRefreshToken(refreshToken);
        const user = await User.findById(refreshPayload.id);

        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ error: "Invalid refresh token" });
        }

        const newAccessToken = await generateAccessToken({
          id: user.id,
          email: user.email,
          username: user.email,
        });

        setTokenCookie(res, newAccessToken);
        req.user = refreshPayload;

        return verifyCsrfToken(req, res, next);
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
    }

    if (err instanceof JWTInvalid) {
      console.error("Invalid JWT:", err);
      return res.status(401).json({ error: "Invalid token" });
    }

    console.error("JWT verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
