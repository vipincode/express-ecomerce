import type { Request, Response } from "express";
import { CategoryInput } from "../schemas/categorySchema";
import { Category, ICategory } from "../models/category.model";
import { handleControllerError } from "../utils/handleControllerError";
import { generateSlug } from "../utils/generateSlug";

interface CategoryRequest extends Request {
  body: CategoryInput;
}

/**
 * POST /api/category
 * Create category
 */
export const createCategory = async (req: CategoryRequest, res: Response) => {
  try {
    const { name, description, parent } = req.body;

    // Auto-generate slug using slugify
    const slug = generateSlug(name);

    // ✅ Check if a category with the same slug already exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    // Validate parent (if provided)
    // let parentCategory = null;
    let parentCategory: ICategory | null = null;
    if (parent) {
      parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
    }

    //Create category
    const category = await Category.create({
      name,
      description,
      slug,
      parent: parentCategory ? parentCategory._id : undefined,
    });
    res.status(201).json({ success: true, message: "Category created successfully", category });
  } catch (error) {
    handleControllerError(res, error, "Failed to create category");
  }
};

/**
 * GET /api/category
 * Fetch all categories
 */
export const getAllCategory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10; // per page
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      Category.find({})
        .populate("parent", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(),
    ]);
    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: categories,
    });
  } catch (error) {
    handleControllerError(res, error, "Error fetching categories");
  }
};

/**
 * GET /api/category/:slug
 * Fetch a single category with slug
 */
export const getOneCategory = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug }).populate("parent", "name slug").lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found for slug: ${slug}`,
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    handleControllerError(res, error, "Error fetching category");
  }
};

/**
 * PUT /api/category/:id
 * Updates an existing category by ID (atomic operation)
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, parent } = req.body;

    // ✅ Validate parent not self
    if (parent && parent === id) {
      return res.status(400).json({
        success: false,
        message: "A category cannot be its own parent",
      });
    }

    // ✅ Check if parent exists (if provided)
    if (parent) {
      const parentExists = await Category.exists({ _id: parent });
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent category",
        });
      }
    }

    // ✅ Generate slug if name changes
    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parent !== undefined) updateData.parent = parent;
    if (name) updateData.slug = generateSlug(name);

    // ✅ Update and return the new document
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true, // return the updated document
      runValidators: true, // ensure Mongoose validation runs
    }).populate("parent", "name slug");

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: `Category not found for id: ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCategory,
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to update category");
  }
};

/**
 * DELETE /api/category/:id
 * Deletes a category and all its subcategories recursively
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found for id: ${id}`,
      });
    }

    // 🧠 Recursive delete helper function
    const deleteCategoryRecursively = async (categoryId: string): Promise<void> => {
      const subcategories = await Category.find({ parent: categoryId }).lean();

      // Recursively delete each subcategory and its children
      for (const sub of subcategories) {
        await deleteCategoryRecursively(sub._id.toString());
      }

      await Category.findByIdAndDelete(categoryId);
    };

    await deleteCategoryRecursively(id);

    res.status(200).json({
      success: true,
      message: "Category and all its subcategories deleted successfully",
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to delete category");
  }
};
