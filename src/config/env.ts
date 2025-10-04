import { env as loadEnv } from "custom-env";
import { z } from "zod";

// Default stage if not set
process.env.APP_STAGE = process.env.APP_STAGE || "dev";

// Load .env.<stage>
loadEnv(process.env.APP_STAGE);

// Validate with Zod
const envSchema = z.object({
  APP_STAGE: z.enum(["dev", "staging", "production"]),
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.string().default("4000"),
  MONGO_URI: z.string().url(),
  DB_NAME: z.string().default("app-db"), // Added DB_NAME
  LOG_PRETTY: z.string().default("true"),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000"),
  RATE_LIMIT_MAX: z.string().default("100"),
});

const env = envSchema.parse(process.env);

export default env;
