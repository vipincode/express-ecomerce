import { z } from "zod";
import mongoose from "mongoose";

/**
 * Zod schema that validates and transforms string/ObjectId inputs
 * into a real mongoose.Types.ObjectId instance.
 */
export const zodObjectId = z.preprocess(
  (val) => {
    // 🧩 Case 1: Already an ObjectId → pass through
    if (val instanceof mongoose.Types.ObjectId) {
      return val;
    }

    // 🧩 Case 2: It's a string → trim & validate
    if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val)) {
      return new mongoose.Types.ObjectId(val);
    }

    // 🧩 Invalid type → return as-is so Zod throws an error
    return val;
  },
  z.instanceof(mongoose.Types.ObjectId, { message: "Invalid ObjectId" })
);

/**
 * Optional variant for optional fields
 */
export const zodObjectIdOptional = zodObjectId.optional();
export const zodObjectIdArray = z.array(zodObjectId);
export const zodObjectIdArrayOptional = z.array(zodObjectId).optional();

/**
 * Usage
 */
// import { z } from "zod";
// import { zodObjectId, zodObjectIdOptional } from "../utils/zodObjectId";

// export const userSchema = z.object({
//   _id: zodObjectIdOptional, // ✅ validates and transforms _id
//   email: z.string().email(),
//   username: z.string().min(3),
//   profile: zodObjectIdOptional,
//   addresses: z.array(zodObjectIdOptional).default([]),
// });
