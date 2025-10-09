import { env as loadEnv } from "custom-env";
import { z } from "zod";

// Default stage if not set
process.env.APP_STAGE = process.env.APP_STAGE || "dev";

// Load .env.<stage>
loadEnv(process.env.APP_STAGE);

// Validate with Zod
const envSchema = z.object({
  // Node environment
  APP_STAGE: z.enum(["dev", "staging", "production"]),
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),

  // Logging
  LOG_PRETTY: z.string().default("true"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  RATE_LIMIT_MAX: z.string().default("100"),

  // Server
  PORT: z.string().default("4000"),

  // Database
  MONGO_URI: z.string().url(),
  DB_NAME: z.string().default("app-db"), // Added DB_NAME

  // JWT & Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
});

const env = envSchema.parse(process.env);

export default env;
