import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  category: Types.ObjectId;
  stock: number;
  images: string[];
  ratingsAverage: number;
  ratingsQuantity: number;
  createdBy: Types.ObjectId;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    price: { type: Number, required: true },
    discountPrice: Number,
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    stock: { type: Number, default: 0 },
    images: [String],
    ratingsAverage: { type: Number, default: 0 },
    ratingsQuantity: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual populate reviews
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

export const Product = model<IProduct>("Product", productSchema);
