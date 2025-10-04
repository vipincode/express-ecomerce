import mongoose from "mongoose";
import { logger } from "./logger";
import env from "./env";

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true); // enforce strict queries

    await mongoose.connect(env.MONGO_URI, {
      dbName: env.DB_NAME,
      serverSelectionTimeoutMS: 5000, // fail fast
      autoIndex: env.NODE_ENV !== "production", // disable auto-indexing in prod
    });

    logger.info(`✅ MongoDB connected to database: ${env.DB_NAME}`);
  } catch (err) {
    logger.error("❌ MongoDB connection error: " + (err as Error).message);
    process.exit(1); // exit if DB fails
  }
};

// Graceful shutdown (important in production!)
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("🔌 MongoDB disconnected");
  } catch (err) {
    logger.error("Error during DB disconnect: " + (err as Error).message);
  }
};
