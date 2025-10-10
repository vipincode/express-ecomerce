import { Request, Response } from "express";
import { User, IUser } from "../models/user.model";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import {
  setTokenCookie,
  setRefreshTokenCookie,
  setCsrfCookie,
  clearAuthCookies,
} from "../utils/cookies";
import { comparePasswords, hashPassword } from "../utils/password";
import { RegisterUserInput } from "../schemas/userSchema";

interface RegisterRequest extends Request {
  body: RegisterUserInput;
}

export const registerUser = async (req: RegisterRequest, res: Response) => {
  try {
    const { email, password, role, username } = req.body;

    // 2️⃣ Check if user already exists
    const isExistingUser = await User.findOne({ email });
    if (isExistingUser) {
      return res.status(409).json({ error: "User already exist" });
    }
    // 2️⃣ Check if username already exists
    const isUsernameExist = await User.findOne({ username });
    if (isUsernameExist) {
      return res.status(409).json({ error: "Username already exist" });
    }
    // 3️⃣ Hash password securely
    const hashedPassword = await hashPassword(password);

    // 4️⃣ Create new user
    const user = new User({
      email,
      username,
      password: hashedPassword,
      role,
      isVerified: true,
    });

    await user.save();

    // 5️⃣ Generate tokens
    const payload = { id: user._id.toString(), email: user.email, username: user.username };
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    // 6️⃣ Save refresh token in DB
    user.refreshToken = refreshToken;

    // 7️⃣ Set cookies
    setTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    setCsrfCookie(res);

    await user.save();

    // 8️⃣ Send success response
    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ✅ Tell TypeScript this is an IUser or null
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await comparePasswords(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Convert ObjectId safely to string
    const payload = { id: user._id.toString(), email: user.email, username: user.email };

    // Generate Tokens
    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    // Lets save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    setCsrfCookie(res);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      message: "Internal server error",
      error: "Login failed",
    });
  }
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
