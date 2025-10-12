## 🧩 1. What Mongoose actually does

Mongoose is built on top of **MongoDB**, and it allows you to build queries in a _chainable_ way:

```ts
Product.find(filter).sort(sortOptions).skip(skip).limit(limit);
```

Here:

- `.find(filter)` → filters documents (like SQL `WHERE`)
- `.sort(sortOptions)` → sorts documents (like SQL `ORDER BY`)
- `.skip()` / `.limit()` → used for pagination

---

## ⚙️ 2. Filtering in Mongoose

Filtering means specifying conditions in your `.find()` query.

### 🧠 Example 1 — basic filtering

```ts
// Find all products where price > 1000
const products = await Product.find({ price: { $gt: 1000 } });
```

| Operator | Description           | Example                                         |
| -------- | --------------------- | ----------------------------------------------- |
| `$eq`    | equal to              | `{ price: { $eq: 100 } }`                       |
| `$ne`    | not equal             | `{ category: { $ne: "670..." } }`               |
| `$gt`    | greater than          | `{ price: { $gt: 1000 } }`                      |
| `$gte`   | greater than or equal | `{ price: { $gte: 1000 } }`                     |
| `$lt`    | less than             | `{ stock: { $lt: 10 } }`                        |
| `$lte`   | less than or equal    | `{ stock: { $lte: 50 } }`                       |
| `$in`    | value in array        | `{ category: { $in: ["phones", "laptops"] } }`  |
| `$regex` | matches pattern       | `{ name: { $regex: "iphone", $options: "i" } }` |

---

### 🧠 Example 2 — combining filters

```ts
// Products with price < 1000 and category "phones"
const filter = {
  price: { $lt: 1000 },
  category: "6708a12b3f...",
};
const products = await Product.find(filter);
```

MongoDB’s filters are composable objects, so you can build them dynamically (like you did in your controller):

```ts
const filter: Record<string, unknown> = {};

if (category) filter.category = category;
if (search) filter.name = { $regex: search, $options: "i" }; // case-insensitive search
if (minPrice && maxPrice) filter.price = { $gte: minPrice, $lte: maxPrice };
```

✅ Very efficient — MongoDB indexes can optimize these queries.

---

## ⚙️ 3. Sorting in Mongoose

Sorting controls the **order of your query results**.

### 🧠 Example 1 — basic sorting

```ts
const products = await Product.find().sort({ price: 1 });
```

- `1` → ascending order
- `-1` → descending order

### 🧠 Example 2 — multiple fields

```ts
const products = await Product.find().sort({ price: -1, name: 1 });
```

➡️ Sorts by price descending, then name ascending.

---

### 🧠 Example 3 — dynamic sorting

If your user sends query params like:

```
?sortBy=price&order=asc
```

You can translate that dynamically:

```ts
import { SortOrder } from "mongoose";

const sortOptions: Record<string, SortOrder> = {
  [sortBy]: order === "asc" ? 1 : -1,
};

const products = await Product.find(filter).sort(sortOptions);
```

✅ `SortOrder` = `1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending'`

---

## 🧮 4. Filtering + Sorting + Pagination together

This is exactly what your current controller does:

```ts
const filter: Record<string, unknown> = {};
if (category) filter.category = category;
if (search) filter.name = { $regex: search, $options: "i" };

const sortOptions: Record<string, SortOrder> = {
  [sortBy]: order === "asc" ? 1 : -1,
};

const pageNum = Math.max(parseInt(page, 10), 1);
const limitNum = Math.max(parseInt(limit, 10), 10);
const skip = (pageNum - 1) * limitNum;

const products = await Product.find(filter).sort(sortOptions).skip(skip).limit(limitNum);
```

✅ Filters first
✅ Sorts next
✅ Then paginates
✅ All executed in a single query to MongoDB.

---

## ⚡ 5. Bonus: Common filter patterns

### 🔹 Text search

```ts
{ name: { $regex: search, $options: "i" } }
```

→ Case-insensitive search for “iphone”.

---

### 🔹 Range filters

```ts
{ price: { $gte: 500, $lte: 1000 } }
```

→ Price between 500 and 1000.

---

### 🔹 Boolean filters

```ts
{
  inStock: true;
}
```

---

### 🔹 Nested filters

If you store nested objects:

```js
specs: { weight: "1.2kg", color: "black" }
```

You can filter like:

```ts
{ "specs.color": "black" }
```

---

### 🔹 Array filters

If you have array fields like:

```js
tags: ["electronics", "apple"];
```

You can filter:

```ts
{
  tags: "apple";
} // finds documents where tags array contains "apple"
```

or:

```ts
{
  tags: {
    $in: ["apple", "samsung"];
  }
}
```

---

## 🧠 6. Sorting by computed or populated fields

You can even sort by populated fields — just use Mongoose’s `aggregate()` pipeline if you need advanced control:

```ts
await Product.aggregate([
  { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
  { $unwind: "$category" },
  { $sort: { "category.name": 1, price: -1 } },
]);
```

✅ Sorts by `category.name` ascending, then `price` descending.

---

## ✅ 7. Summary Table

| Task                     | Mongoose Syntax                                    | Example                                         |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------- |
| **Filter equal**         | `{ field: value }`                                 | `{ category: "phones" }`                        |
| **Filter with operator** | `{ field: { $gt: 100 } }`                          | `{ price: { $gte: 1000 } }`                     |
| **Text search**          | `{ field: { $regex, $options } }`                  | `{ name: { $regex: "iphone", $options: "i" } }` |
| **Sort ascending**       | `.sort({ field: 1 })`                              | `.sort({ price: 1 })`                           |
| **Sort descending**      | `.sort({ field: -1 })`                             | `.sort({ price: -1 })`                          |
| **Pagination**           | `.skip(skip).limit(limit)`                         | `.skip(10).limit(10)`                           |
| **Combine all**          | `.find(filter).sort(sort).skip(skip).limit(limit)` | ✅ Production style                             |

---

## 🚀 Real-life flow (like your API)

### Example request:

```
GET /api/products?category=6708a12b3f&search=iphone&sortBy=price&order=asc&page=2&limit=5
```

### Translated in backend:

```ts
filter = {
  category: "6708a12b3f",
  name: { $regex: "iphone", $options: "i" }
}

sort = { price: 1 }

skip = (2 - 1) * 5 = 5
limit = 5
```

### Final Mongoose query:

```ts
Product.find(filter).sort(sort).skip(5).limit(5);
```

✅ Returns 5 “iphone” products from category `6708a12b3f`,
sorted by price ascending,
page 2 of results.

---
