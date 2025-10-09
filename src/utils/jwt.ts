import { SignJWT, jwtVerify } from "jose";
import { createSecretKey } from "crypto";
import { JwtPayload } from "../types";
import env from "../config/env";

export const generateAccessToken = async (payload: JwtPayload) => {
  const secretKey = createSecretKey(Buffer.from(env.JWT_SECRET, "utf-8"));
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secretKey);
};

export const generateRefreshToken = async (payload: JwtPayload) => {
  const secretKey = createSecretKey(Buffer.from(env.REFRESH_TOKEN_SECRET!, "utf-8"));
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN || "30d")
    .sign(secretKey);
};

export const verifyAccessToken = async (token: string) => {
  const secretKey = createSecretKey(Buffer.from(env.JWT_SECRET, "utf-8"));
  const { payload } = await jwtVerify(token, secretKey);
  return payload as JwtPayload;
};

export const verifyRefreshToken = async (token: string) => {
  const secretKey = createSecretKey(Buffer.from(env.REFRESH_TOKEN_SECRET!, "utf-8"));
  const { payload } = await jwtVerify(token, secretKey);
  return payload as JwtPayload;
};
