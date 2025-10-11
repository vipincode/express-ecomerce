import { z } from "zod";
import { zodObjectIdOptional } from "../utils/zodObjectId";

export const categorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  parent: zodObjectIdOptional,
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Number(val)) && Number(val) > 0 : true), {
      message: "Page must be a positive number",
    }),
  limit: z
    .string()
    .optional()
    .refine((val) => (val ? !isNaN(Number(val)) && Number(val) > 0 : true), {
      message: "Limit must be a positive number",
    }),
});

export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
});

export const idParamSchema = z.object({
  id: zodObjectIdOptional,
});

export type CategoryInput = z.infer<typeof categorySchema>;
