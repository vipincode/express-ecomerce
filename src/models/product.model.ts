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

// ✅ Compound indexes for performance
productSchema.index({ name: 1, category: 1 }); // speeds up searches by name + category
productSchema.index({ price: 1 }); // for price-based sorting/filtering
productSchema.index({ createdAt: -1 }); // for recent products
productSchema.index({ ratingsAverage: -1 }); // for top-rated products

// ✅ Text index for search
productSchema.index({ name: "text", description: "text" });

// Virtual populate reviews
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

export const Product = model<IProduct>("Product", productSchema);
