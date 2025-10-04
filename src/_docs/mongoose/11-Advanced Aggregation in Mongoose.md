Perfect ⚡ — now we move into one of the **most powerful MongoDB + Mongoose capabilities** — the **Aggregation Framework**.

If you want to build dashboards, analytics, reporting tools, or perform complex queries efficiently — **aggregation pipelines** are the key.

Let’s master them step-by-step 👇

---

# 📘 Chapter 11: Advanced Aggregation in Mongoose

---

## 🧠 11.1 What is an Aggregation?

An **aggregation** is a **data processing pipeline** in MongoDB — a sequence of stages that transform documents into computed results.

Think of it like **SQL GROUP BY + JOIN + WHERE + ORDER BY**, but more powerful and flexible.

Aggregation pipelines are run **on the MongoDB server**, not in your Node.js process — which makes them extremely fast ⚡.

---

## 🧩 11.2 Basic Syntax

You define a series of **stages**, each performing an operation on the data.

```ts
await Order.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", totalAmount: { $sum: "$amount" } } },
  { $sort: { totalAmount: -1 } },
]);
```

✅ Filters only completed orders
✅ Groups by customer ID
✅ Sums the total order amount
✅ Sorts highest → lowest

---

## ⚙️ 11.3 Common Aggregation Stages

| Stage        | Description                        | Example                                                                                 |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `$match`     | Filter documents                   | `{ $match: { isActive: true } }`                                                        |
| `$group`     | Group by field and compute values  | `{ $group: { _id: "$category", total: { $sum: "$price" } } }`                           |
| `$sort`      | Sort results                       | `{ $sort: { createdAt: -1 } }`                                                          |
| `$limit`     | Limit output count                 | `{ $limit: 10 }`                                                                        |
| `$skip`      | Skip results (pagination)          | `{ $skip: 20 }`                                                                         |
| `$project`   | Include/transform fields           | `{ $project: { name: 1, total: 1 } }`                                                   |
| `$lookup`    | Join another collection            | `{ $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } }` |
| `$unwind`    | Deconstruct arrays                 | `{ $unwind: "$items" }`                                                                 |
| `$facet`     | Run multiple pipelines in parallel | `{ $facet: { total: [...], breakdown: [...] } }`                                        |
| `$addFields` | Add computed fields                | `{ $addFields: { totalWithTax: { $multiply: ["$price", 1.18] } } }`                     |

---

## ⚡ 11.4 Example: Simple Sales Report

```ts
await Order.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$productId",
      totalRevenue: { $sum: "$amount" },
      totalOrders: { $sum: 1 },
    },
  },
  { $sort: { totalRevenue: -1 } },
  { $limit: 5 },
]);
```

✅ Get top 5 products by revenue
✅ Fast & computed on the server

---

## 🧩 11.5 `$lookup` — Performing Joins

You can join data from different collections.

```ts
await Order.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userDetails",
    },
  },
  { $unwind: "$userDetails" },
  { $project: { amount: 1, "userDetails.name": 1, "userDetails.email": 1 } },
]);
```

✅ Joins each order with its user info
✅ Works like an SQL `LEFT JOIN`

---

## 🧠 11.6 `$facet` — Multiple Pipelines in One Query

Perfect for **dashboards** that need multiple data sets at once.

```ts
await Order.aggregate([
  {
    $facet: {
      totalRevenue: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
      orderCount: [{ $count: "totalOrders" }],
      averageOrder: [{ $group: { _id: null, avg: { $avg: "$amount" } } }],
    },
  },
]);
```

✅ One DB call → multiple metrics
✅ Ideal for dashboards & analytics

---

## ⚙️ 11.7 `$addFields` and `$project` (Transform Data)

You can shape data in the pipeline.

```ts
await Product.aggregate([
  { $match: { isActive: true } },
  { $addFields: { priceWithTax: { $multiply: ["$price", 1.18] } } },
  { $project: { name: 1, priceWithTax: 1, _id: 0 } },
]);
```

✅ Add computed field (taxed price)
✅ Control output fields

---

## 🔍 11.8 `$unwind` — Flatten Arrays

If you have arrays inside documents:

```ts
{
  _id: 1,
  orderId: 101,
  items: [{ name: "Phone" }, { name: "Charger" }]
}
```

You can “explode” them:

```ts
await Order.aggregate([{ $unwind: "$items" }]);
```

Output:

```
{ orderId: 101, items: { name: "Phone" } }
{ orderId: 101, items: { name: "Charger" } }
```

✅ Useful for array-based analytics
✅ Works with `$group` to count nested data

---

## 🧠 11.9 `$bucket` and `$bucketAuto` (Histogram)

Useful for analytics (e.g., group users by age range):

```ts
await User.aggregate([
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 18, 30, 50, 100],
      default: "Unknown",
      output: { count: { $sum: 1 } },
    },
  },
]);
```

✅ Groups users into age ranges
✅ Like SQL CASE GROUP

---

## ⚡ 11.10 Pagination with Aggregation

You can use `$facet` for paginated data + total count in one query:

```ts
await User.aggregate([
  {
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: 10 }, { $limit: 10 }],
    },
  },
]);
```

✅ Single query → total count + paginated data
✅ Ideal for API endpoints

---

## 🧮 11.11 Real-World Example: E-Commerce Dashboard

```ts
await Order.aggregate([
  { $match: { status: "completed" } },
  {
    $facet: {
      totalRevenue: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
      topProducts: [
        { $group: { _id: "$productId", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ],
      dailyRevenue: [
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ],
    },
  },
]);
```

✅ Returns:

- total revenue
- top 5 products
- daily revenue trend

All in a single MongoDB query!

---

## 🧩 11.12 Mongoose API for Aggregations

You can use either:

```ts
Model.aggregate(pipeline);
```

or chain aggregation helpers:

```ts
User.aggregate()
  .match({ age: { $gte: 18 } })
  .group({ _id: "$role", total: { $sum: 1 } });
```

✅ Works exactly like native MongoDB aggregation
✅ Fully typed in TypeScript

---

## 🧠 11.13 Performance Optimization Tips

| ✅ Best Practice                          | 💡 Why                               |
| ----------------------------------------- | ------------------------------------ |
| Use `$match` early                        | Filters data early = faster pipeline |
| Use `$project` to limit fields            | Smaller data = faster processing     |
| Index fields used in `$match` or `$sort`  | Avoid full scans                     |
| Avoid `$lookup` on large unindexed fields | Joins can be expensive               |
| Cache heavy aggregations (Redis)          | Great for dashboards                 |
| Use `$facet` for multiple metrics         | Reduces multiple DB calls            |

---

## ⚙️ 11.14 Example: Redis + Aggregation Cache

Combine your Redis caching from the previous chapter 👇

```ts
import { redis } from "./redis.js";
import { Order } from "./models/order.model.js";

export const getSalesDashboard = async () => {
  const key = "dashboard:sales";
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await Order.aggregate([
    { $match: { status: "completed" } },
    {
      $facet: {
        totalRevenue: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
        topProducts: [
          { $group: { _id: "$productId", total: { $sum: "$amount" } } },
          { $sort: { total: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);

  await redis.set(key, JSON.stringify(result), "EX", 300); // Cache for 5 minutes
  return result;
};
```

✅ Single cached query for entire dashboard
✅ Ultra-fast response for analytics pages

---

## 🧠 11.15 Summary

| Concept                                                              | Description                     |
| -------------------------------------------------------------------- | ------------------------------- | --------------------------- |
| `$match`                                                             | Filter stage (like WHERE)       |
| 12-Practical Example: Aggregation in Action with Real Mongoose Schem | `$group`                        | Group stage (like GROUP BY) |
| `$lookup`                                                            | Join collections                |
| `$project`                                                           | Select / transform fields       |
| `$facet`                                                             | Multi-pipeline analytics        |
| `$unwind`                                                            | Flatten arrays                  |
| `$addFields`                                                         | Create computed fields          |
| Aggregation + Redis                                                  | Cached analytics for dashboards |

---

## 🚀 Coming Next: **Point 12 – Schema Inheritance & Discriminators**

You’ll learn:

- How to reuse schemas across related models
- Using **discriminators** for schema inheritance
- When to use single collection inheritance vs multiple collections
- Real-world example: `User → Admin / Customer` models
- Querying across discriminated schemas efficiently

---
