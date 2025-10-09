# 📘 Chapter 7: Querying Data in Mongoose

---

## 🧠 7.1 What is a Query in Mongoose?

A **query** is a way to fetch or modify data from MongoDB using Mongoose’s chainable API.

Mongoose queries are **lazy** — they’re only executed when you call `.exec()` or use `await`.

```ts
const query = User.find({ age: { $gte: 18 } }); // defines a query
const users = await query.exec(); // executes it
```

---

## ⚙️ 7.2 Basic CRUD Queries

| Operation       | Mongoose Method    | Description                     |
| --------------- | ------------------ | ------------------------------- |
| **Create**      | `User.create()`    | Insert new doc                  |
| **Read (many)** | `User.find()`      | Returns all matching documents  |
| **Read (one)**  | `User.findOne()`   | Returns first matching document |
| **Read by ID**  | `User.findById()`  | Finds doc by `_id`              |
| **Update one**  | `User.updateOne()` | Updates matching doc            |
| **Delete one**  | `User.deleteOne()` | Deletes a document              |

Example:

```ts
await User.create({ name: "Vipin", age: 25 });
await User.find({ age: { $gte: 18 } });
await User.findById("66f0...");
await User.updateOne({ name: "Vipin" }, { age: 30 });
await User.deleteOne({ name: "Vipin" });
```

---

## 🔍 7.3 Query Operators

MongoDB’s operators let you build complex filters.

| Operator      | Meaning              | Example                                     |
| ------------- | -------------------- | ------------------------------------------- |
| `$eq`         | Equal to             | `{ age: { $eq: 25 } }`                      |
| `$ne`         | Not equal            | `{ role: { $ne: "admin" } }`                |
| `$gt`, `$gte` | Greater than / equal | `{ age: { $gte: 18 } }`                     |
| `$lt`, `$lte` | Less than / equal    | `{ age: { $lte: 60 } }`                     |
| `$in`, `$nin` | In / not in          | `{ role: { $in: ["user", "admin"] } }`      |
| `$or`, `$and` | Logical operators    | `{ $or: [{ age: 18 }, { role: "admin" }] }` |
| `$regex`      | Pattern match        | `{ name: { $regex: /vipin/i } }`            |

Example:

```ts
await User.find({ $or: [{ age: { $gte: 18 } }, { role: "admin" }] });
```

---

## 🧩 7.4 Chaining Query Helpers

Mongoose supports **chaining** — combining filters, sort, select, skip, etc.

Example:

```ts
const users = await User.find({ isActive: true })
  .sort({ age: -1 })
  .skip(10)
  .limit(5)
  .select("name email age -_id");
```

| Helper                   | Description                       |
| ------------------------ | --------------------------------- |
| `.sort({ field: 1/-1 })` | Sort ascending/descending         |
| `.select("fields")`      | Include/exclude fields            |
| `.skip(n)`               | Skip first n results (pagination) |
| `.limit(n)`              | Limit number of results           |
| `.lean()`                | Return plain JS objects (faster)  |

---

## ⚡ 7.5 Pagination (Production Approach)

### Basic skip-limit pagination:

```ts
const page = 2;
const limit = 10;
const skip = (page - 1) * limit;

const users = await User.find().skip(skip).limit(limit);
```

### Cursor-based pagination (recommended for large data):

```ts
const users = await User.find({ _id: { $gt: lastUserId } }).limit(10);
```

✅ More efficient for large collections
✅ Avoids issues with missing/skipped data

---

## 🧮 7.6 Projection (Select Specific Fields)

You can project (include/exclude) fields for efficiency:

```ts
await User.find({}, "name email"); // include only name, email
await User.find({}, { password: 0 }); // exclude password
```

You can also chain `.select()`:

```ts
User.find().select("name email -_id");
```

---

## ⚙️ 7.7 Querying Subdocuments and Arrays

### Query inside an array:

```ts
User.find({ "skills.name": "JavaScript" });
```

### Match multiple conditions:

```ts
User.find({
  hobbies: { $all: ["reading", "coding"] },
});
```

### Search by nested field:

```ts
User.find({ "address.city": "Delhi" });
```

---

## 🧠 7.8 Using `countDocuments()` and `exists()`

```ts
const total = await User.countDocuments({ isActive: true });
const exists = await User.exists({ email: "vipin@mail.com" });
```

✅ `countDocuments` → Returns total number
✅ `exists` → Returns boolean-like result (fast existence check)

---

## ⚙️ 7.9 Using `.lean()` for Performance

`.lean()` tells Mongoose to skip creating full Mongoose documents and return plain JS objects.

```ts
const users = await User.find().lean();
```

✅ Much faster (no getters/setters, virtuals, or middleware)
✅ Lower memory overhead

⚠️ Don’t use `.lean()` if you rely on virtuals or schema transforms.

---

## 🧩 7.10 Using `.populate()` with Queries

You can still use `.populate()` inside query chains:

```ts
await Post.find().populate("author", "name email").sort({ createdAt: -1 }).limit(5);
```

Or nested populate:

```ts
Post.find().populate({
  path: "author",
  populate: { path: "profile" },
});
```

---

## 🧠 7.11 Using `.orFail()` and `.catch()`

`.orFail()` throws an error if no document is found:

```ts
const user = await User.findById(id).orFail(new Error("User not found"));
```

✅ Great for APIs
✅ Prevents silent `null` returns

---

## ⚡ 7.12 Query Optimization with `.explain()`

You can inspect how MongoDB executes a query:

```ts
await User.find({ email: "vipin@mail.com" }).explain("executionStats");
```

Result shows:

- **COLLSCAN** → full collection scan (slow)
- **IXSCAN** → index scan (fast)
- **Execution time** & **docs examined**

✅ Always ensure frequent queries use **indexes** (see Chapter 3)

---

## 🧩 7.13 Reusable Query Functions (Best Practice)

Instead of writing raw queries everywhere, define helper methods.

Example:

```ts
// user.model.ts
userSchema.statics.findActive = function () {
  return this.find({ isActive: true }).select("name email");
};

userSchema.methods.isAdult = function () {
  return this.age >= 18;
};

export const User = model<IUser, IUserModel>("User", userSchema);
```

Usage:

```ts
await User.findActive();
const vipin = await User.findOne();
console.log(vipin.isAdult());
```

✅ Cleaner
✅ Testable
✅ DRY principle

---

## 🧱 7.14 Real-World Example: Search + Filter + Pagination

```ts
interface QueryParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

async function getUsers({ search, role, page = 1, limit = 10 }: QueryParams) {
  const query: any = {};

  if (search) query.name = { $regex: search, $options: "i" };
  if (role) query.role = role;

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select("name email role createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(query);

  return { users, total, totalPages: Math.ceil(total / limit) };
}
```

✅ Efficient search
✅ Paginates results
✅ Ready for production APIs

---

## 🧠 7.15 Production Query Best Practices

| ✅ Do                               | ❌ Avoid                                |
| ----------------------------------- | --------------------------------------- |
| Use `.lean()` for read-heavy routes | Returning full Mongoose docs everywhere |
| Always paginate results             | Returning all data                      |
| Use projection (`.select`)          | Fetching unnecessary fields             |
| Combine filters logically           | Hardcoded multiple queries              |
| Use indexes for frequent queries    | Filtering large fields without indexes  |
| Monitor queries with `.explain()`   | Ignoring performance metrics            |

---

## 🧠 Summary

| Concept          | Description                                 |
| ---------------- | ------------------------------------------- |
| Query            | Defines how data is fetched/modified        |
| Operators        | Powerful MongoDB filters                    |
| Helpers          | Chain `.select`, `.sort`, `.limit`, `.skip` |
| Pagination       | Use skip/limit or cursor-based              |
| Projection       | Include/exclude specific fields             |
| `.lean()`        | Faster, returns plain objects               |
| `.explain()`     | Shows query performance                     |
| Reusable Queries | Create static & instance methods            |

---

## 🚀 Coming Next: **Point 8 – Middleware (Hooks)**

You’ll learn:

- The difference between **pre** and **post** middleware
- Types of middleware: document, query, aggregate, and model
- Common use cases: logging, password hashing, auditing
- Async pitfalls & best practices
- Real-world example: `pre('save')` for hashing passwords and `post('find')` for logs

---
