import { Request, Response } from "express";
import { User } from "../models/user.model";

import { clearAuthCookies } from "../utils/cookies";

export const logoutUser = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }

  clearAuthCookies(res);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};
