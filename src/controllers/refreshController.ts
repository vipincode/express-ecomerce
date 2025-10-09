// src/controllers/refreshController.ts
import { Request, Response } from "express";
import { User } from "../models/user.model";
import { verifyRefreshToken, generateAccessToken } from "../utils/jwt";
import { setTokenCookie } from "../utils/cookies";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = await verifyRefreshToken(token);
    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.email,
    });

    setTokenCookie(res, newAccessToken);
    return res.status(200).json({ message: "Access token refreshed" });
  } catch (err) {
    return res.status(403).json({ error: "Expired or invalid refresh token" });
  }
};
