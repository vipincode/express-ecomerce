import { Schema, model, Document, Types } from "mongoose";

export interface IAddress extends Document {
  user: Types.ObjectId;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Address = model<IAddress>("Address", addressSchema);
