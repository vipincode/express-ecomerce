# ⚙️ Practical Example: Aggregation in Action with Real Mongoose Schema

---

## 🧩 Step 1: Define the Schema (E-Commerce Example)

We’ll use a realistic setup:

- `User` — customers placing orders
- `Product` — items sold
- `Order` — transaction record connecting users & products

---

### **User Schema**

```ts
import { Schema, model, Types } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  city: string;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  city: { type: String, required: true },
});

export const User = model<IUser>("User", userSchema);
```

---

### **Product Schema**

```ts
export interface IProduct {
  name: string;
  category: string;
  price: number; // in rupees
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
});

export const Product = model<IProduct>("Product", productSchema);
```

---

### **Order Schema**

```ts
export interface IOrder {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  totalAmount: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export const Order = model<IOrder>("Order", orderSchema);
```

---

## 🧠 Step 2: Insert Sample Data

Example (for local test):

```ts
await User.insertMany([
  { name: "Vipin", email: "vipin@mail.com", city: "Delhi" },
  { name: "Aman", email: "aman@mail.com", city: "Mumbai" },
]);

await Product.insertMany([
  { name: "Phone", category: "Electronics", price: 15000 },
  { name: "Headphones", category: "Electronics", price: 2000 },
  { name: "Shoes", category: "Fashion", price: 3000 },
]);

await Order.insertMany([
  {
    userId: user1._id,
    productId: product1._id,
    quantity: 2,
    totalAmount: 30000,
    status: "completed",
  },
  {
    userId: user2._id,
    productId: product3._id,
    quantity: 1,
    totalAmount: 3000,
    status: "completed",
  },
  {
    userId: user1._id,
    productId: product2._id,
    quantity: 3,
    totalAmount: 6000,
    status: "completed",
  },
]);
```

---

## 🔍 Step 3: Example 1 — Total Revenue by Category

Let’s analyze total sales grouped by product category.

```ts
const result = await Order.aggregate([
  // 1️⃣ Join with Product collection
  {
    $lookup: {
      from: "products", // collection name in lowercase + plural
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },

  // 2️⃣ Flatten the joined product array
  { $unwind: "$product" },

  // 3️⃣ Only completed orders
  { $match: { status: "completed" } },

  // 4️⃣ Group by category
  {
    $group: {
      _id: "$product.category",
      totalRevenue: { $sum: "$totalAmount" },
      totalQuantity: { $sum: "$quantity" },
      avgOrderValue: { $avg: "$totalAmount" },
    },
  },

  // 5️⃣ Sort by highest revenue
  { $sort: { totalRevenue: -1 } },
]);
```

---

### ✅ Output Example

```json
[
  {
    "_id": "Electronics",
    "totalRevenue": 36000,
    "totalQuantity": 5,
    "avgOrderValue": 12000
  },
  {
    "_id": "Fashion",
    "totalRevenue": 3000,
    "totalQuantity": 1,
    "avgOrderValue": 3000
  }
]
```

---

### 🧩 Stage-by-Stage Breakdown

| Stage     | Operation                    | What It Does                       |
| --------- | ---------------------------- | ---------------------------------- |
| `$lookup` | Join `Order` ↔ `Product`    | Bring product info into each order |
| `$unwind` | Flatten product array        | One order per document             |
| `$match`  | Filter only completed orders | Clean data                         |
| `$group`  | Group by category            | Aggregate sales data               |
| `$sort`   | Sort high to low revenue     | Ranking for dashboard              |

✅ This is the backbone for dashboards — “Revenue by Category”.

---

## ⚙️ Step 4: Example 2 — Top Customers by Total Spending

Now let’s find the **top customers** by how much they’ve spent.

```ts
const topCustomers = await Order.aggregate([
  // Join with User data
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },

  // Only completed orders
  { $match: { status: "completed" } },

  // Group by user
  {
    $group: {
      _id: "$user._id",
      name: { $first: "$user.name" },
      email: { $first: "$user.email" },
      totalSpent: { $sum: "$totalAmount" },
      totalOrders: { $sum: 1 },
    },
  },

  // Sort by totalSpent
  { $sort: { totalSpent: -1 } },

  // Limit top 5
  { $limit: 5 },
]);
```

---

### ✅ Output Example

```json
[
  {
    "_id": "66f...",
    "name": "Vipin",
    "email": "vipin@mail.com",
    "totalSpent": 36000,
    "totalOrders": 2
  },
  {
    "_id": "66f...",
    "name": "Aman",
    "email": "aman@mail.com",
    "totalSpent": 3000,
    "totalOrders": 1
  }
]
```

---

### 🧩 Stage Breakdown

| Stage     | Description                       |
| --------- | --------------------------------- |
| `$lookup` | Join orders with users            |
| `$unwind` | Flatten user array                |
| `$match`  | Keep only completed orders        |
| `$group`  | Aggregate total spending per user |
| `$sort`   | Rank users by spending            |
| `$limit`  | Take top 5                        |

✅ This query is great for analytics dashboards: “Top Customers by Revenue”.

---

## 🧮 Step 5: Example 3 — Daily Revenue Trend (Time Series)

```ts
const dailySales = await Order.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: {
        date: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
      },
      totalRevenue: { $sum: "$totalAmount" },
      ordersCount: { $sum: 1 },
    },
  },
  { $sort: { "_id.date": 1 } },
]);
```

✅ Output Example:

```json
[
  { "_id": { "date": "2025-10-01" }, "totalRevenue": 15000, "ordersCount": 2 },
  { "_id": { "date": "2025-10-02" }, "totalRevenue": 18000, "ordersCount": 3 }
]
```

✅ Use this for charts like “Revenue Over Time” or line graphs.

---

## ⚡ Step 6: Example 4 — `$facet` Dashboard (All-in-One)

Now combine all insights into one **dashboard query**:

```ts
const dashboard = await Order.aggregate([
  { $match: { status: "completed" } },
  {
    $facet: {
      totalRevenue: [{ $group: { _id: null, total: { $sum: "$totalAmount" } } }],
      topCategories: [
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 3 },
      ],
      dailySales: [
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ],
    },
  },
]);
```

✅ Returns a **complete analytics payload** for a dashboard —
**total revenue**, **top categories**, **daily trend** — all in one DB hit.

---

### ✅ Example Output

```json
[
  {
    "totalRevenue": [{ "total": 39000 }],
    "topCategories": [
      { "_id": "Electronics", "totalRevenue": 36000 },
      { "_id": "Fashion", "totalRevenue": 3000 }
    ],
    "dailySales": [
      { "_id": "2025-10-01", "totalRevenue": 15000 },
      { "_id": "2025-10-02", "totalRevenue": 24000 }
    ]
  }
]
```

---

## 🧠 Step 7: Key Insights

| Concept    | Description                              |
| ---------- | ---------------------------------------- |
| `$lookup`  | Joins other collections (like SQL joins) |
| `$unwind`  | Flattens array fields after lookup       |
| `$match`   | Filters docs before aggregation          |
| `$group`   | Performs sums, counts, averages          |
| `$facet`   | Parallel pipelines (like subqueries)     |
| `$sort`    | Orders result efficiently                |
| `$project` | Shapes the final output                  |

---

## 🧠 Step 8: Performance Tips for Aggregation

✅ Use `$match` early → filter first
✅ Use `$project` early → reduce document size
✅ Index fields used in `$match` or `$lookup`
✅ Cache results using Redis if reused often
✅ Avoid `$lookup` on massive collections unless indexed
✅ For frequent analytics — store denormalized “summary” data

---

## 🧠 Summary

| Aggregation Type | Use Case                           |
| ---------------- | ---------------------------------- |
| Category revenue | Dashboard category summary         |
| Top customers    | Loyalty & ranking features         |
| Daily revenue    | Charts and time-series             |
| `$facet`         | Full analytics report in one query |

---

## 🚀 Coming Next: **Point 12 – Schema Inheritance & Discriminators**

We’ll cover:

- What discriminators are and why they’re powerful
- How to use **base schemas** for shared fields
- Example: `User → Admin / Customer` inheritance
- Querying across discriminators
- Real-world examples with role-based systems

---

Excellent question 👏 — this little piece —

```ts
as: "product";
```

inside your `$lookup` stage — is _super_ important to understand clearly.

It controls **how the joined documents are stored** after MongoDB performs the lookup (join).

Let’s break it down in simple and deep detail 👇

---

# 🧩 `$lookup` Stage — Deep Explanation

The `$lookup` stage in MongoDB’s aggregation pipeline is like a **JOIN** in SQL.
It lets you pull data from another collection and combine it with your current one.

---

### General Structure of `$lookup`

```ts
{
  $lookup: {
    from: "<foreign_collection_name>",
    localField: "<field_in_current_collection>",
    foreignField: "<field_in_foreign_collection>",
    as: "<output_field_name>"
  }
}
```

---

### Explanation of Each Property

| Property         | Description                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **from**         | The name of the _other collection_ you want to join (must match the MongoDB collection name, _not_ the model name). |
| **localField**   | The field in the current collection (e.g., `productId` in the `Order` collection).                                  |
| **foreignField** | The field in the foreign collection to match against (usually `_id` in the `Product` collection).                   |
| **as**           | The name of the new array field that will contain the _joined data_.                                                |

---

### Example Context

We’re in the **`Order`** collection, and we want to **join product info** from the **`Product`** collection.

```ts
await Order.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },
]);
```

---

### What Happens Internally

MongoDB performs this:

> “For every document in the `orders` collection,
> find the documents in `products` where
> `products._id === orders.productId`.”

Then, it adds a **new array field** called `product` to each order.

---

### 🧠 Example Before `$lookup`

**Order document:**

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000
}
```

**Product document:**

```json
{
  "_id": "P1",
  "name": "Phone",
  "category": "Electronics",
  "price": 15000
}
```

---

### 🧩 After `$lookup` (Before `$unwind`)

The resulting document looks like this 👇

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000,
  "product": [
    {
      "_id": "P1",
      "name": "Phone",
      "category": "Electronics",
      "price": 15000
    }
  ]
}
```

💡 Notice:

- The joined data from `products` is stored inside a **new array field** named `"product"`.
- This field name comes **exactly** from `as: "product"`.

---

### ⚙️ Why It’s an Array

Because MongoDB allows **1-to-many relationships**, the `$lookup` result is **always an array** (even if there’s only one matching document).

If `productId` matched multiple products (in theory), all of them would be inside the `"product"` array.

---

### 🔧 Flattening the Result with `$unwind`

Since we often know there’s only **one matching product**, we use `$unwind` to **flatten** that array.

```ts
{
  $unwind: "$product";
}
```

Result:

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000,
  "product": {
    "_id": "P1",
    "name": "Phone",
    "category": "Electronics",
    "price": 15000
  }
}
```

✅ Now, `product` is an **object**, not an array.
✅ Much easier to use in further aggregation stages or API responses.

---

### ⚡ Summary of `$lookup` Properties

| Field          | Example Value | Description                                             |
| -------------- | ------------- | ------------------------------------------------------- |
| `from`         | `"products"`  | Collection to join                                      |
| `localField`   | `"productId"` | Field in current (`orders`) collection                  |
| `foreignField` | `"_id"`       | Field in the `products` collection                      |
| `as`           | `"product"`   | Name of new array field containing the joined documents |

---

### 🧠 SQL Analogy

Think of `$lookup` as this SQL query:

```sql
SELECT *
FROM orders o
LEFT JOIN products p
ON o.productId = p._id;
```

Here, `as: "product"` → means → store all `p.*` (joined data) in a field named `"product"` inside each order document.

---

### 💡 Best Practices

✅ Always choose a clear `as` name
→ e.g., `"product"`, `"userInfo"`, `"categoryDetails"`

✅ Use `$unwind` after `$lookup` if it’s 1:1 relation
✅ Index the `foreignField` for faster join performance
✅ Keep `from` name lowercase + plural (matches MongoDB collection naming)

---

### 🧮 Advanced Example with Multiple `$lookup`s

You can chain multiple joins:

```ts
await Order.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: "$product" },
  { $project: { "user.name": 1, "product.name": 1, totalAmount: 1 } },
]);
```

✅ Adds both user and product data inside each order document.

---

### ⚙️ Summary Visualization

```
┌────────────────────────────┐
│        orders              │
│ ─────────────────────────  │
│ _id: O1                    │
│ productId: P1              │
│ ...                        │
└────────────┬───────────────┘
             │
             │ $lookup (join)
             ▼
┌────────────────────────────┐
│        products            │
│ ─────────────────────────  │
│ _id: P1                    │
│ name: "Phone"              │
│ category: "Electronics"    │
└────────────────────────────┘
Result:
{
  ...orderFields,
  product: [ {...productFields} ]
}
```

---

## Ex-lookup

inside your `$lookup` stage — is _super_ important to understand clearly.

It controls **how the joined documents are stored** after MongoDB performs the lookup (join).

Let’s break it down in simple and deep detail 👇

---

# 🧩 `$lookup` Stage — Deep Explanation

The `$lookup` stage in MongoDB’s aggregation pipeline is like a **JOIN** in SQL.
It lets you pull data from another collection and combine it with your current one.

---

### General Structure of `$lookup`

```ts
{
  $lookup: {
    from: "<foreign_collection_name>",
    localField: "<field_in_current_collection>",
    foreignField: "<field_in_foreign_collection>",
    as: "<output_field_name>"
  }
}
```

---

### Explanation of Each Property

| Property         | Description                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **from**         | The name of the _other collection_ you want to join (must match the MongoDB collection name, _not_ the model name). |
| **localField**   | The field in the current collection (e.g., `productId` in the `Order` collection).                                  |
| **foreignField** | The field in the foreign collection to match against (usually `_id` in the `Product` collection).                   |
| **as**           | The name of the new array field that will contain the _joined data_.                                                |

---

### Example Context

We’re in the **`Order`** collection, and we want to **join product info** from the **`Product`** collection.

```ts
await Order.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },
]);
```

---

### What Happens Internally

MongoDB performs this:

> “For every document in the `orders` collection,
> find the documents in `products` where
> `products._id === orders.productId`.”

Then, it adds a **new array field** called `product` to each order.

---

### 🧠 Example Before `$lookup`

**Order document:**

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000
}
```

**Product document:**

```json
{
  "_id": "P1",
  "name": "Phone",
  "category": "Electronics",
  "price": 15000
}
```

---

### 🧩 After `$lookup` (Before `$unwind`)

The resulting document looks like this 👇

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000,
  "product": [
    {
      "_id": "P1",
      "name": "Phone",
      "category": "Electronics",
      "price": 15000
    }
  ]
}
```

💡 Notice:

- The joined data from `products` is stored inside a **new array field** named `"product"`.
- This field name comes **exactly** from `as: "product"`.

---

### ⚙️ Why It’s an Array

Because MongoDB allows **1-to-many relationships**, the `$lookup` result is **always an array** (even if there’s only one matching document).

If `productId` matched multiple products (in theory), all of them would be inside the `"product"` array.

---

### 🔧 Flattening the Result with `$unwind`

Since we often know there’s only **one matching product**, we use `$unwind` to **flatten** that array.

```ts
{
  $unwind: "$product";
}
```

Result:

```json
{
  "_id": "O1",
  "userId": "U1",
  "productId": "P1",
  "quantity": 2,
  "totalAmount": 30000,
  "product": {
    "_id": "P1",
    "name": "Phone",
    "category": "Electronics",
    "price": 15000
  }
}
```

✅ Now, `product` is an **object**, not an array.
✅ Much easier to use in further aggregation stages or API responses.

---

### ⚡ Summary of `$lookup` Properties

| Field          | Example Value | Description                                             |
| -------------- | ------------- | ------------------------------------------------------- |
| `from`         | `"products"`  | Collection to join                                      |
| `localField`   | `"productId"` | Field in current (`orders`) collection                  |
| `foreignField` | `"_id"`       | Field in the `products` collection                      |
| `as`           | `"product"`   | Name of new array field containing the joined documents |

---

### 🧠 SQL Analogy

Think of `$lookup` as this SQL query:

```sql
SELECT *
FROM orders o
LEFT JOIN products p
ON o.productId = p._id;
```

Here, `as: "product"` → means → store all `p.*` (joined data) in a field named `"product"` inside each order document.

---

### 💡 Best Practices

✅ Always choose a clear `as` name
→ e.g., `"product"`, `"userInfo"`, `"categoryDetails"`

✅ Use `$unwind` after `$lookup` if it’s 1:1 relation
✅ Index the `foreignField` for faster join performance
✅ Keep `from` name lowercase + plural (matches MongoDB collection naming)

---

### 🧮 Advanced Example with Multiple `$lookup`s

You can chain multiple joins:

```ts
await Order.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: "$product" },
  { $project: { "user.name": 1, "product.name": 1, totalAmount: 1 } },
]);
```

✅ Adds both user and product data inside each order document.

---

### ⚙️ Summary Visualization

```
┌────────────────────────────┐
│        orders              │
│ ─────────────────────────  │
│ _id: O1                    │
│ productId: P1              │
│ ...                        │
└────────────┬───────────────┘
             │
             │ $lookup (join)
             ▼
┌────────────────────────────┐
│        products            │
│ ─────────────────────────  │
│ _id: P1                    │
│ name: "Phone"              │
│ category: "Electronics"    │
└────────────────────────────┘
Result:
{
  ...orderFields,
  product: [ {...productFields} ]
}
```

---
