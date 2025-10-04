import rateLimit from "express-rate-limit";
import env from "../config/env";

// ✅ Global Rate Limiter (applies to all routes)
export const globalRateLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX),
  standardHeaders: true, // ✅ Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // ❌ Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    error: "Too many requests, please try again later.",
  },
});
