import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User, IUser } from "../models/user.model";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import {
  setTokenCookie,
  setRefreshTokenCookie,
  setCsrfCookie,
  clearAuthCookies,
} from "../utils/cookies";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // ✅ Tell TypeScript this is an IUser or null
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  // ✅ Convert ObjectId safely to string
  const payload = { id: user._id.toString(), email: user.email, username: user.email };

  const accessToken = await generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  setTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
  setCsrfCookie(res);

  res.status(200).json({ message: "Login successful" });
};

export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const user: IUser | null = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }

  clearAuthCookies(res);
  res.status(200).json({ message: "Logged out successfully" });
};
