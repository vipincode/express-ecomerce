import type { Response } from "express";
import { ProductsDataInput } from "../schemas/productSchema";
import { handleControllerError } from "../utils/handleControllerError";
import { generateSlug } from "../utils/generateSlug";
import { Category } from "../models/category.model";
import { Product } from "../models/product.model";
import mongoose, { SortOrder } from "mongoose";
import { TypedRequest } from "../types/typed-request";
import { QueryParamsType } from "../types";

/**
 * @desc Create a new product
 * @route POST /api/products
 */
export const createProduct = async (
  req: TypedRequest<Record<string, never>, ProductsDataInput, Record<string, never>>,
  res: Response
) => {
  try {
    const { name, category, description, images, price, discountPrice, stock, createdBy } =
      req.body;

    // ✅ Ensure category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    // ✅ Generate slug
    const slug = generateSlug(name);

    // ✅ Prevent duplicate slug (case-insensitive)
    const existing = await Product.findOne({ slug: { $regex: new RegExp(`^${slug}$`, "i") } });
    if (existing) {
      return res.status(409).json({ message: "Product with this name already exists" });
    }

    // ✅ Create new product
    const product = await Product.create({
      name,
      slug,
      description,
      images,
      price,
      discountPrice,
      stock,
      category: new mongoose.Types.ObjectId(category),
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    handleControllerError(res, error, "Error creating product");
  }
};

export const getAllProduct = async (
  req: TypedRequest<Record<string, never>, Record<string, never>, QueryParamsType>,
  res: Response
) => {
  try {
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      order = "desc",
      category,
      search,
    } = req.query;
    const filter: Record<string, unknown> = {};

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $option: "i" };
    }

    // 🧩 Determine sorting order
    const sortOptions: Record<string, SortOrder> = {
      [sortBy]: order === "asc" ? 1 : -1,
    };

    // 🧩 Query total count
    const total = await Product.countDocuments(filter);

    // 🧩 Fetch paginated results
    const products = await Product.find(filter)
      .populate("category", "name slug")
      .populate("createdBy", "username email")
      .lean()
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // 🧮 Pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages,
      currentPage: pageNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: products,
    });
  } catch (error) {
    handleControllerError(res, error, "Error fetching products");
  }
};

export const getOneProduct = async (req: TypedRequest<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    const product = await Product.findOne(isValidObjectId ? { _id: id } : { slug: id })
      .populate("category", "name slug")
      .populate("createdBy", "username email")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    handleControllerError(res, error, "Error fetching products");
  }
};

/**
 * @desc Update an existing product
 * @route PUT /api/products/:id
 * @access Private/Admin (optional auth layer)
 */
export const updateProduct = async (
  req: TypedRequest<{ id: string }, ProductsDataInput>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const data = req.body; // already validated by middleware

    // ✅ Ensure product exists first
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ If category changed, verify it exists
    if (data.category) {
      const categoryExists = await Category.findById(data.category);
      if (!categoryExists) {
        return res.status(404).json({ message: "Category not found" });
      }
      data.category = new mongoose.Types.ObjectId(data.category);
    }

    // ✅ If name changed, regenerate slug & ensure uniqueness
    if (data.name && data.name !== existingProduct.name) {
      const newSlug = generateSlug(data.name);

      const duplicate = await Product.findOne({
        slug: { $regex: new RegExp(`^${newSlug}$`, "i") },
        _id: { $ne: id }, // exclude the current product
      });

      if (duplicate) {
        return res.status(409).json({ message: "Another product with this name already exists" });
      }

      data.slug = newSlug;
    }

    // ✅ Update product (validated data only)
    const updatedProduct = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .populate("category", "name slug")
      .populate("createdBy", "username email");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    handleControllerError(res, error, "Error updating product");
  }
};

export const deleteProduct = async (
  req: TypedRequest<{ id: string }, ProductsDataInput>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    handleControllerError(res, error, "Error deleting product");
  }
};
