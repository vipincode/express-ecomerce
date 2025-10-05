Perfect 🚀 — now let’s build a **complete CRUD API** for your **Category** schema (with parent/child relationship) using **Express + Mongoose + TypeScript**.

We’ll go step-by-step and follow **clean architecture** 🧠:
1️⃣ Model ✅
2️⃣ Controller ✅
3️⃣ Routes ✅
4️⃣ Example Requests ✅

---

## 🧱 1. Model (you already have this)

`models/category.model.ts`

```ts
import { Schema, model, Document, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parent?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  },
  { timestamps: true }
);

// Virtual: list of child categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

export const Category = model<ICategory>("Category", categorySchema);
```

---

## 🧭 2. Controller (Business Logic)

Let’s create a **CRUD controller** in `controllers/category.controller.ts`.

We’ll implement:

- ✅ Create Category
- ✅ Get All Categories
- ✅ Get One Category (with children)
- ✅ Update Category
- ✅ Delete Category

---

`controllers/category.controller.ts`

```ts
import { Request, Response } from "express";
import { Category } from "../models/category.model";
import slugify from "slugify";

// 🟢 Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, parent } = req.body;

    // Generate slug from name
    const slug = slugify(name, { lower: true });

    // Check if category already exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      parent: parent || null,
    });

    return res.status(201).json({ message: "Category created", data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 🔵 Get all categories (flat or with parent info)
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find()
      .populate("parent", "name slug")
      .sort({ createdAt: -1 });

    res.json({ count: categories.length, data: categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟡 Get one category (with its children)
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate("parent", "name slug")
      .populate("children", "name slug");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 🟠 Update a category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, parent } = req.body;

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true });
    }
    if (description !== undefined) updateData.description = description;
    if (parent !== undefined) updateData.parent = parent;

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!category) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Category updated", data: category });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 🔴 Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Optional: prevent deletion if has children
    const children = await Category.find({ parent: id });
    if (children.length > 0) {
      return res.status(400).json({ message: "Cannot delete category with subcategories" });
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
```

---

## 🧭 3. Routes

`routes/category.routes.ts`

```ts
import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";

const router = Router();

router.post("/", createCategory);
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
```

Then mount it in your main server:

```ts
import express from "express";
import mongoose from "mongoose";
import categoryRoutes from "./routes/category.routes";

const app = express();
app.use(express.json());

app.use("/api/categories", categoryRoutes);

mongoose
  .connect("mongodb://127.0.0.1:27017/ecommerce")
  .then(() => console.log("MongoDB connected"));

app.listen(5000, () => console.log("Server running on port 5000"));
```

---

## 🧪 4. Example Requests

### ✅ Create Category

**POST** `/api/categories`

```json
{
  "name": "Electronics",
  "description": "All electronic items"
}
```

**Response:**

```json
{
  "message": "Category created",
  "data": {
    "_id": "671a...",
    "name": "Electronics",
    "slug": "electronics",
    "description": "All electronic items",
    "parent": null
  }
}
```

---

### ✅ Create Subcategory

**POST** `/api/categories`

```json
{
  "name": "Laptops",
  "parent": "671a12345abcdef"
}
```

Now `"Laptops"` will reference `"Electronics"` as `parent`.

---

### 🔍 Get All Categories

**GET** `/api/categories`

You’ll get:

```json
{
  "count": 2,
  "data": [
    {
      "name": "Electronics",
      "slug": "electronics"
    },
    {
      "name": "Laptops",
      "slug": "laptops",
      "parent": { "name": "Electronics", "slug": "electronics" }
    }
  ]
}
```

---

### 🔍 Get One Category (with children)

**GET** `/api/categories/:id`

```json
{
  "data": {
    "name": "Electronics",
    "children": [{ "name": "Laptops", "slug": "laptops" }]
  }
}
```

---

### ✏️ Update Category

**PUT** `/api/categories/:id`

```json
{
  "name": "Electronics & Gadgets"
}
```

---

### 🗑️ Delete Category

**DELETE** `/api/categories/:id`

If it has children → blocked:

```json
{
  "message": "Cannot delete category with subcategories"
}
```

---

✅ **This CRUD supports:**

- Hierarchical categories (`parent`)
- Automatic slugging (`slugify`)
- Reverse populate (`children`)
- Validation & error handling
- Prevent deletion if has children

---
