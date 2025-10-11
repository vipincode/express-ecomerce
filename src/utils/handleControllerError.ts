import { Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";

/**
 * Handles and formats API errors in a consistent, production-safe way.
 */
export const handleControllerError = (
  res: Response,
  error: unknown,
  defaultMessage = "Internal server error",
) => {
  console.error("🔥 Controller Error:", error);

  // 1️⃣ Zod validation errors
  // 1️⃣ Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // 2️⃣ Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Database validation failed",
      errors: Object.values(error.errors).map((err) => ({
        path: err.path,
        message: err.message,
      })),
    });
  }

  // 3️⃣ Mongoose duplicate key errors
  if (error instanceof mongoose.Error && "code" in error && (error as any).code === 11000) {
    const dupKey = Object.keys((error as any).keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate ${dupKey} already exists`,
    });
  }

  // 4️⃣ Generic JS Error
  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      message: defaultMessage,
      error: error.message,
    });
  }

  // 5️⃣ Fallback for unknown types (string, number, etc.)
  return res.status(500).json({
    success: false,
    message: defaultMessage,
  });
};
