import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: "user" | "admin";
  isVerified: boolean;
  profile?: Types.ObjectId;
  addresses: Types.ObjectId[];
  refreshToken?: string; // ✅ add this
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    profile: { type: Schema.Types.ObjectId, ref: "Profile" },
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
    refreshToken: { type: String }, // ✅
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
