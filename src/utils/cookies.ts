import env from "../config/env";
import type { Response } from "express";
import { randomBytes } from "crypto";

/**
 *
 * @param res Set cookie function
 * @param token
 */
export const setTokenCookie = (res: Response, token: string) => {
  const isProduction = env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

/**
 *
 * @param refresh cookie function
 * @param token
 */
export const setRefreshTokenCookie = (res: Response, token: string) => {
  const isProduction = env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
};

/**
 * Generates a CSRF token and sets it as a cookie.
 * @param res - Express Response object
 * @returns The generated CSRF token (for debugging or optional use)
 */
export const setCsrfCookie = (res: Response): string => {
  const csrfToken = randomBytes(24).toString("hex");

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false, // accessible by frontend (for X-CSRF-Token header)
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return csrfToken;
};

/**
 * Clears both auth and CSRF cookies safely.
 * @param res Express response
 */
export const clearAuthCookies = (res: Response) => {
  const isProduction = env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  res.clearCookie("csrfToken", {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
};
