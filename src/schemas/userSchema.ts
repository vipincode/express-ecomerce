import { z } from "zod";
import { zodObjectIdOptional } from "../utils/zodObjectId";

export const registerUserSchema = z.object({
  email: z.email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin"]).default("user"),
  isVerified: z.boolean().default(false),
  profile: zodObjectIdOptional,
  addresses: z.array(zodObjectIdOptional, "Invalid ObjectId").default([]),
  refreshToken: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const loginUserSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
