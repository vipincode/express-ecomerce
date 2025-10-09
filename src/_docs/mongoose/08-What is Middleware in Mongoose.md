# 📗 Chapter 8: Middleware (Hooks)

---

Mongoose **middleware**, also known as **hooks**, let you **run logic before or after** certain operations like saving, updating, deleting, or finding documents.

This is how you add **business logic**, **security**, **logging**, and **automation** into your data layer — keeping your controllers clean.

---

## 🧠 8.1 What is Middleware in Mongoose?

Middleware are functions that run **before (`pre`)** or **after (`post`)** certain Mongoose operations.

They’re similar to Express middleware — but instead of handling requests, they handle **document lifecycle events**.

### Common use cases:

- Hashing passwords before saving 🧂
- Automatically populating references
- Soft deletes (mark instead of remove)
- Logging updates
- Auditing data changes
- Cascading deletes

---

## ⚙️ 8.2 Middleware Types

Mongoose has **four main categories** of middleware:

| Type          | Triggered On                              | Example                               |
| ------------- | ----------------------------------------- | ------------------------------------- |
| **Document**  | `.save()`, `.validate()`, `.remove()`     | Modify or validate data before saving |
| **Query**     | `.find()`, `.updateOne()`, `.deleteOne()` | Modify query or handle result         |
| **Aggregate** | `.aggregate()`                            | Modify aggregation pipeline           |
| **Model**     | `.insertMany()`                           | Run logic on batch inserts            |

---

## 🧩 8.3 Pre Middleware (Before Action)

### Example: `pre('save')`

```ts
import bcrypt from "bcryptjs";

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Only hash if password changed
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

✅ Hashes the password before saving
✅ Skips rehashing if the password wasn’t changed

---

### Example: `pre('find')` — Auto filter

```ts
userSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});
```

✅ Automatically filters out soft-deleted documents from all queries.

---

### Example: `pre('updateOne')` — Add updated timestamp

```ts
userSchema.pre("updateOne", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});
```

---

## ⚡ 8.4 Post Middleware (After Action)

### Example: `post('save')`

```ts
userSchema.post("save", function (doc) {
  console.log(`✅ User ${doc.email} saved successfully`);
});
```

### Example: `post('find')`

```ts
userSchema.post("find", function (docs) {
  console.log(`📄 Returned ${docs.length} users`);
});
```

### Example: `post('remove')`

```ts
userSchema.post("remove", function (doc) {
  console.log(`🗑️ User ${doc.email} removed`);
});
```

---

## 🧠 8.5 Document Middleware Flow

For document-level operations like `.save()`:

```
validate → pre('save') → save → post('save')
```

### Example Order:

```ts
userSchema.pre("validate", () => console.log("Validating"));
userSchema.pre("save", () => console.log("Saving..."));
userSchema.post("save", () => console.log("Saved!"));
```

Output:

```
Validating
Saving...
Saved!
```

---

## ⚙️ 8.6 Query Middleware Flow

For query operations like `.find()`, `.updateOne()`, `.deleteOne()`:

```
pre('find') → query runs → post('find')
```

You can modify the **query itself** using `this`.

Example:

```ts
userSchema.pre("find", function (next) {
  this.select("-password -__v"); // hide sensitive fields
  next();
});
```

---

## 🧩 8.7 Aggregate Middleware

You can modify aggregation pipelines dynamically before they run.

Example:

```ts
userSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDeleted: false } });
  next();
});
```

✅ Ensures every aggregation excludes soft-deleted users.

---

## ⚡ 8.8 Model Middleware (`insertMany`)

`Model` middleware runs on bulk operations like `insertMany()`.

Example:

```ts
userSchema.pre("insertMany", async function (next, docs) {
  for (const doc of docs) {
    doc.createdAt = new Date();
  }
  next();
});
```

---

## 🧮 8.9 Combining Middleware: Example (Password Hash + Soft Delete + Logging)

```ts
import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new Schema({
  name: String,
  email: String,
  password: String,
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

// 🔹 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔹 Soft delete handling
userSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

// 🔹 Auto update timestamp
userSchema.pre("updateOne", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// 🔹 Log after deletion
userSchema.post("deleteOne", { document: true, query: false }, function (doc) {
  console.log(`🗑️ Deleted user: ${doc.email}`);
});

export const User = model("User", userSchema);
```

✅ Password hashing
✅ Soft delete filter
✅ Logging deletion events
✅ Auto update timestamps

---

## 🧠 8.10 Async Middleware Gotchas

| Mistake                                  | Problem                   | Fix                                               |
| ---------------------------------------- | ------------------------- | ------------------------------------------------- |
| Forgetting `next()`                      | Middleware never finishes | Always call `next()` unless returning a promise   |
| Using async + `next()` together          | Causes double execution   | Use either async/await OR callback, not both      |
| Calling `this.model()` in arrow function | Loses `this` context      | Always use regular functions, not arrow functions |

---

## ⚙️ 8.11 Global Middleware (Applied to All Schemas)

You can apply global hooks for logging or metrics.

```ts
mongoose.plugin((schema) => {
  schema.pre("save", function (next) {
    console.log(`Saving a ${schema.options.collection} document...`);
    next();
  });
});
```

✅ Great for global audit logs, metrics, or analytics.

---

## 🧠 8.12 Production Use Cases

| Use Case         | Middleware Type                | Example            |
| ---------------- | ------------------------------ | ------------------ |
| Password Hashing | `pre('save')`                  | Security           |
| Soft Delete      | `pre(/^find/)`                 | Filter             |
| Auto Timestamp   | `pre('updateOne')`             | UpdatedAt tracking |
| Logging          | `post('save')`, `post('find')` | Audit              |
| Cascade Delete   | `post('remove')`               | Cleanup            |
| Populate on Read | `pre('find')`                  | Auto join          |
| Validation       | `pre('validate')`              | Business logic     |

---

## 🧩 8.13 Debugging Middleware Execution

You can see middleware order & timing using:

```ts
mongoose.set("debug", true);
```

Or manually log in your middleware:

```ts
userSchema.pre("save", function () {
  console.log("[Middleware] Pre-save executed");
});
```

---

## 🧠 Summary

| Concept              | Description                                |
| -------------------- | ------------------------------------------ |
| Pre Middleware       | Runs **before** an action                  |
| Post Middleware      | Runs **after** an action                   |
| Document Middleware  | For `.save()`, `.validate()`               |
| Query Middleware     | For `.find()`, `.updateOne()`              |
| Aggregate Middleware | For `.aggregate()` pipelines               |
| Model Middleware     | For `.insertMany()`                        |
| Best Practice        | Use regular functions, not arrow functions |

---

## 🚀 Coming Next: **Point 9 – Transactions & Sessions**

You’ll learn:

- What **transactions** are and why they matter for consistency
- How to start and commit a transaction in Mongoose
- Rollback strategies and error handling
- Multi-document ACID operations
- Real-world examples (e.g., user signup + wallet creation in one atomic step)

---
