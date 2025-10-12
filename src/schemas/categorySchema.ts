import { z } from "zod";
import { zodObjectIdOptional } from "../utils/zodObjectId";

export const categorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  parent: zodObjectIdOptional,
});

export type CategoryInput = z.infer<typeof categorySchema>;
