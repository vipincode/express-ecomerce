Nice — below is a **complete, final update** that adds **refresh-token rotation** to your existing codebase and wires it into the auto-refresh middleware. I kept the style and file layout you already use and included safe handling for **token reuse detection** (revokes all sessions if reuse detected). I also included a short note and optional code-snippet for **hashing refresh tokens** (recommended).

**Files I’m giving you:**

1. `src/models/User.ts` — adds `refreshTokens` array
2. `src/middleware/auth.ts` — auto-refresh middleware with rotation + reuse detection
3. `src/controllers/authController.ts` — `loginUser` (issues tokens)
4. `src/controllers/refreshController.ts` — explicit `/refresh` endpoint (rotates)
5. `src/controllers/logoutController.ts` — logout current device / all devices
6. small helper: token-hashing snippet (optional)

Copy each into the indicated path and adjust import paths if you have a different aliasing scheme.

---

# 1) `src/models/User.ts`

```ts
import { Schema, model, Document, Types } from "mongoose";

export interface IRefreshToken {
  token: string;
  createdAt: Date;
  // optional metadata: ip, userAgent, deviceId etc.
  ip?: string;
  userAgent?: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: "user" | "admin";
  isVerified: boolean;
  profile?: Types.ObjectId;
  addresses: Types.ObjectId[];
  // rotating refresh tokens (one per device/session)
  refreshTokens: IRefreshToken[];
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  ip: { type: String },
  userAgent: { type: String },
});

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    profile: { type: Schema.Types.ObjectId, ref: "Profile" },
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
    refreshTokens: [refreshTokenSchema], // ← rotating tokens
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
```

---

# 2) `src/middleware/auth.ts`

(autorefresh + rotation on refresh-token usage; detects reuse)

```ts
import { Request, Response, NextFunction } from "express";
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt";
import { User } from "../models/User";
import { setTokenCookie, setRefreshTokenCookie } from "../utils/cookies";

/**
 * authenticateUser middleware:
 * - verifies access token
 * - if access expired and refresh exists, rotates refresh token and issues new access token
 * - if refresh token reuse detected -> clears all refreshTokens for that user and forces logout
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Try normal access token verification
    const payload = await verifyAccessToken(accessToken);
    req.user = payload;
    return next();
  } catch (err: any) {
    // If access token expired (or otherwise invalid), try refresh flow
    // jose throws errors — check message for "expired" or rely on missing/invalid token falling through
    try {
      if (!refreshToken) {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }

      const refreshPayload = await verifyRefreshToken(refreshToken);
      const user = await User.findById(refreshPayload.id);
      if (!user) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      // Find the stored refresh token (rotation)
      const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === refreshToken);

      if (tokenIndex === -1) {
        // Token not found => possible refresh token reuse attack.
        // Revoke all refresh tokens for safety.
        user.refreshTokens = [];
        await user.save();
        // Clear cookies on response
        res.clearCookie("token");
        res.clearCookie("refreshToken");
        res.clearCookie("csrfToken");
        return res.status(403).json({ error: "Refresh token reuse detected. Session revoked." });
      }

      // Remove the old refresh token (rotate)
      user.refreshTokens.splice(tokenIndex, 1);

      // Create new tokens (access + refresh)
      const newAccessToken = await generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        username: user.email,
      });

      const newRefreshToken = await generateRefreshToken({
        id: user._id.toString(),
        email: user.email,
        username: user.email,
      });

      // Save the new refresh token
      user.refreshTokens.push({ token: newRefreshToken, createdAt: new Date() });
      await user.save();

      // Set cookies: new access + new refresh
      setTokenCookie(res, newAccessToken);
      setRefreshTokenCookie(res, newRefreshToken);

      // Attach user and continue
      req.user = refreshPayload;
      return next();
    } catch (refreshErr) {
      // verification of refresh failed or other error
      console.error("Refresh token error:", refreshErr);
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
  }
};
```

---

# 3) `src/controllers/authController.ts` — login with rotation (pushes refresh token)

```ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { setTokenCookie, setRefreshTokenCookie, setCsrfCookie } from "../utils/cookies";

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  const payload = { id: user._id.toString(), email: user.email, username: user.email };

  // Generate tokens
  const accessToken = await generateAccessToken(payload);
  const refreshToken = await generateRefreshToken(payload);

  // Save the refresh token (one per device/session)
  user.refreshTokens.push({ token: refreshToken, createdAt: new Date() });
  await user.save();

  // Set cookies
  setTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
  setCsrfCookie(res);

  return res.status(200).json({ message: "Login successful" });
};
```

---

# 4) `src/controllers/refreshController.ts` — explicit endpoint to rotate tokens

(Useful if frontend wants to call `/api/auth/refresh` explicitly)

```ts
import { Request, Response } from "express";
import { User } from "../models/User";
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { setTokenCookie, setRefreshTokenCookie } from "../utils/cookies";

export const refreshAccessToken = async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies?.refreshToken;
  if (!oldRefreshToken) return res.status(401).json({ error: "No refresh token provided" });

  try {
    const payload = await verifyRefreshToken(oldRefreshToken);
    const user = await User.findById(payload.id);
    if (!user) return res.status(403).json({ error: "User not found" });

    // Check existence (rotation)
    const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === oldRefreshToken);
    if (tokenIndex === -1) {
      // Reuse detected
      user.refreshTokens = [];
      await user.save();
      res.clearCookie("token");
      res.clearCookie("refreshToken");
      res.clearCookie("csrfToken");
      return res.status(403).json({ error: "Refresh token reuse detected. Session revoked." });
    }

    // Remove old refresh token
    user.refreshTokens.splice(tokenIndex, 1);

    // Issue new tokens
    const newAccessToken = await generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      username: user.email,
    });

    const newRefreshToken = await generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      username: user.email,
    });

    user.refreshTokens.push({ token: newRefreshToken, createdAt: new Date() });
    await user.save();

    // Set cookies
    setTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({ message: "Access token refreshed" });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
};
```

---

# 5) `src/controllers/logoutController.ts` — logout current device or all devices

```ts
import { Request, Response } from "express";
import { User } from "../models/User";
import { clearAuthCookies } from "../utils/cookies";

/**
 * Logout only this device/session (remove this refresh token)
 */
export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const user = await User.findOne({ "refreshTokens.token": refreshToken });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
      await user.save();
    }
  }

  clearAuthCookies(res);
  return res.status(200).json({ message: "Logged out successfully" });
};

/**
 * Logout from all devices (clear all refresh tokens)
 * requires authentication (user must be known on req.user)
 */
export const logoutAllDevices = async (req: Request, res: Response) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(400).json({ error: "Missing user" });

  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
  clearAuthCookies(res);
  return res.status(200).json({ message: "Logged out from all devices" });
};
```

---

# Optional: Hash refresh tokens before storing (recommended)

If your DB is compromised this helps a lot — store a SHA256 hash instead of the raw token.

**Helper**

```ts
// src/utils/hash.ts
import { createHash } from "crypto";

export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};
```

**How to integrate**

- When issuing a refresh token: `user.refreshTokens.push({ token: hashToken(refreshToken), ... })`
- On verification: compare `hashToken(oldRefreshToken)` to stored tokens.
- This requires you to keep raw refresh tokens only in the cookie; the DB stores only the hash.

I didn't change the code above to hashing automatically so you can opt in — if you want, I can produce the hashed-version now and update all usages.

---

## Quick notes & gotchas

- Make sure `REFRESH_TOKEN_SECRET` exists in your env and meets min length in Zod config.
- `setCsrfCookie()` stays as before — CSRF token rotation is independent of refresh rotation.
- If you use multiple devices, the `refreshTokens` array keeps them separate. Consider adding `ip` / `userAgent` to help users view active sessions.
- Test flows carefully: login → access-protected route → wait for access token expiry → ensure `authenticateUser` silently issues new tokens. Also test explicit `/refresh` and logout scenarios.
- If you prefer the middleware not to rotate tokens automatically (only refresh endpoint rotates), you can move rotation logic to `/refresh` controller — but I included rotation in both middleware and controller to keep behavior consistent.

---

Want me to:

- produce the **hashed-token** version now (change all files accordingly), or
- give you a small **test plan** with example requests to run through Postman/HTTPie to verify the flows?
