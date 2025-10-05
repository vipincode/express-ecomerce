Perfect 💥 — now we’re moving into the **practical design stage** where relationships really matter.
Let’s break this scenario down **conceptually first**, then show the **Mongoose schema design** with clear reasoning 👇

---

## 🧠 Scenario Recap

We have three entities:

1. 🛍️ **Product**
2. 🧾 **Review**
3. 📂 **Category**

And relationships:

- A **Product** can have many **Reviews** ✅
- A **Review** belongs to one **Product** ✅
- A **Product** belongs to one **Category** ✅
- A **Category** can have many **Products** ✅

---

We’ll decide **which side stores the reference**, and **why**, based on:

- Data size
- Query pattern
- Read vs write frequency
- Growth

---

# 🧱 Step 1. Product ↔ Review (One-to-Many)

🧠 **Meaning**:
Each product can have many reviews,
Each review belongs to exactly one product.

So this is a classic **1:N** relationship.

---

### 🧩 Option 1: Embed Reviews inside Product

```js
{
  _id: ObjectId("p1"),
  name: "Laptop",
  reviews: [
    { user: "Vipin", rating: 5, comment: "Great!" },
    { user: "Raj", rating: 4, comment: "Good!" }
  ]
}
```

#### ✅ Pros:

- One query → get product + reviews
- Super fast reads (if always needed together)

#### ⚠️ Cons:

- Product document grows with reviews
- Can hit **16MB limit** quickly
- Difficult to manage updates (edit/delete review)

> ❌ Not ideal for production-scale apps where reviews grow large.

---

### 🧩 Option 2: Reference Product in Review (**Best Practice**)

Let the **Review** store a reference to the **Product**.

```ts
// review.model.ts
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
});
```

Now, in **Product**, we don’t store `reviews` explicitly,
but we can still **virtually populate** them 👇

```ts
// product.model.ts
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});
```

---

✅ **Why this design?**

- Reviews can grow indefinitely → separate collection ✅
- Can fetch them only when needed (with `.populate('reviews')`) ✅
- Easy to query reviews independently ✅
- Clean Product schema ✅

---

✅ **Query Example:**

```ts
const product = await Product.findById(id).populate("reviews");
console.log(product.reviews); // all reviews for this product
```

✅ **Review Query Example:**

```ts
const reviews = await Review.find({ product: productId }).populate("product");
```

---

✅ **Summary**

| Side    | Field                          | Relationship  | Why               |
| ------- | ------------------------------ | ------------- | ----------------- |
| Review  | `product: ObjectId('Product')` | N:1           | Efficient scaling |
| Product | `virtual('reviews')`           | 1:N (reverse) | Clean & queryable |

---

# 🧱 Step 2. Product ↔ Category (Many-to-One)

🧠 **Meaning**:
Each **Product** belongs to one **Category**.
Each **Category** can have many **Products**.

So this is a **1:N** relationship (one category → many products).

---

### 🧩 Option 1: Store Products in Category (Embed)

```js
{
  _id: ObjectId("c1"),
  name: "Electronics",
  products: [ObjectId("p1"), ObjectId("p2")]
}
```

⚠️ Not ideal — category could have **thousands** of products.
Harder to paginate, update, or remove.

---

### 🧩 Option 2: Store Category in Product (**Best Practice**)

```ts
// product.model.ts
const productSchema = new Schema({
  name: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  price: Number,
  stock: Number,
});
```

✅ **Why?**

- Product knows which category it belongs to
- Products often queried _by category_, not vice versa
- Category doesn’t need to store huge array

> 💡 Example: `Product.find({ category: electronicsId })`

---

✅ **Category Virtual Populate:**
If you want to list all products in a category:

```ts
categorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
});
```

✅ Then:

```ts
Category.findById(id).populate("products");
```

---

✅ **Summary**

| Side     | Field                            | Relationship  | Why                      |
| -------- | -------------------------------- | ------------- | ------------------------ |
| Product  | `category: ObjectId('Category')` | N:1           | Clean reference          |
| Category | `virtual('products')`            | 1:N (reverse) | Efficient reverse access |

---

# 🧩 Step 3. Combined Design

Let’s connect all three in a full structure:

```ts
// category.model.ts
const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
});

categorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
});

// product.model.ts
const productSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  price: Number,
  stock: Number,
});

productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

// review.model.ts
const reviewSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true },
  comment: String,
});

reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // prevent duplicate reviews
```

---

# 🧠 Query Examples

### ✅ Get Product + Category + Reviews

```ts
const product = await Product.findById(productId)
  .populate("category", "name slug")
  .populate("reviews");
```

### ✅ Get Category with all Products

```ts
const category = await Category.findById(catId).populate({
  path: "products",
  populate: { path: "reviews" }, // nested populate (optional)
});
```

### ✅ Get all Reviews with Product info

```ts
const reviews = await Review.find().populate("product", "name category");
```

---

# 📦 Final Relationship Summary

| Relationship        | Direction     | Implementation                   | Access Pattern          |
| ------------------- | ------------- | -------------------------------- | ----------------------- |
| Product → Category  | N:1           | `category: ObjectId('Category')` | `.populate('category')` |
| Category → Products | 1:N (virtual) | `virtual('products')`            | `.populate('products')` |
| Review → Product    | N:1           | `product: ObjectId('Product')`   | `.populate('product')`  |
| Product → Reviews   | 1:N (virtual) | `virtual('reviews')`             | `.populate('reviews')`  |

---

✅ **Key Takeaways:**

- **Always store reference in child** (e.g., `product` in `Review`, `category` in `Product`)
- **Use virtual populate** for reverse lookup (parent → children)
- **Avoid embedding** for large, growing data (like reviews or products)
- **Use indexes** (e.g. `product + user` unique in reviews)

---
