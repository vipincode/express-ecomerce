import { Schema, model, Document, Types } from "mongoose";

export interface IPayment extends Document {
  order: Types.ObjectId;
  method: "card" | "paypal" | "cod";
  transactionId?: string;
  status: "pending" | "completed" | "failed";
  amount: number;
}

const paymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    method: { type: String, enum: ["card", "paypal", "cod"], required: true },
    transactionId: String,
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>("Payment", paymentSchema);
