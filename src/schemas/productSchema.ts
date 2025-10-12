import { z } from "zod";
import { zodObjectId, zodObjectIdOptional } from "../utils/zodObjectId"; // assuming you defined it

export const productSchema = z
  .object({
    name: z.string().min(1, "Product name is required").max(100, "Name too long"),
    description: z.string().optional(),
    slug: z.string().optional(),
    price: z.number().min(1, "Price must be at least 1"),
    discountPrice: z.number().optional(),
    category: zodObjectId, // if you built zodObjectId this way
    stock: z.number().default(0),
    images: z.array(z.string()).default([]),
    ratingsAverage: z.number().default(0),
    ratingsQuantity: z.number().default(0),
    createdBy: zodObjectIdOptional,
  })
  .refine((data) => !data.discountPrice || data.discountPrice < data.price, {
    message: "Discount price must be less than price",
    path: ["discountPrice"],
  });

export type ProductsDataInput = z.infer<typeof productSchema>;
