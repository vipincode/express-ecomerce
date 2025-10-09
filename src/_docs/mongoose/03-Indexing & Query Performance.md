# 📙 Chapter 3: Indexing & Query Performance

---

## 🧭 3.1 What Are Indexes?

An **index** in MongoDB is like an **address book** for your data — it helps the database find documents faster without scanning every record.

### 🧠 Example

Without index:

> MongoDB checks every document to find `email: "vipin@mail.com"`

With index:

> MongoDB goes directly to the location of `"vipin@mail.com"` using a B-tree structure.

---

## ⚙️ 3.2 How Indexes Work Internally

MongoDB indexes are **B-tree data structures** stored separately from your main collection.
When you query on an indexed field, MongoDB searches **inside the B-tree**, not the whole collection.

### Simplified visualization:

```
Without Index:
[SCAN ALL 1M DOCUMENTS] → find email

With Index:
[SCAN 1K ENTRIES IN INDEX TREE] → find exact match
```

✅ Fast lookups
✅ Efficient sorting
⚠️ But — slower writes (each write must update the index)

---

## 🧩 3.3 How to Define Indexes in Mongoose

You can create indexes in **two main ways**:

### 1️⃣ Field-level index

```ts
const userSchema = new Schema({
  email: { type: String, unique: true, index: true },
  name: { type: String, index: true },
});
```

### 2️⃣ Compound or custom index

```ts
userSchema.index({ email: 1, name: -1 });
```

> `1` means ascending, `-1` means descending order.

Used when you frequently query on multiple fields together, e.g.:

```js
User.find({ email: "vipin@mail.com", name: "Vipin" });
```

---

## 📘 3.4 Types of Indexes

| Index Type        | Description                       | Example                                                             |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| **Single Field**  | Indexes one field                 | `{ name: 1 }`                                                       |
| **Compound**      | Indexes multiple fields together  | `{ name: 1, email: -1 }`                                            |
| **Text Index**    | Enables full-text search          | `{ description: "text" }`                                           |
| **Hashed Index**  | Good for equality queries only    | `{ _id: "hashed" }`                                                 |
| **TTL Index**     | Auto deletes docs after X seconds | `{ createdAt: 1 }`, `{ expireAfterSeconds: 3600 }`                  |
| **Sparse Index**  | Only indexes existing fields      | `{ phone: 1 }` + `{ sparse: true }`                                 |
| **Partial Index** | Indexes subset of documents       | `{ age: 1 }` + `{ partialFilterExpression: { age: { $gte: 18 } } }` |

---

## ⚡ 3.5 Creating Text Indexes (for Search)

Example:

```ts
const productSchema = new Schema({
  name: String,
  description: String,
});

productSchema.index({ name: "text", description: "text" });
```

Search:

```ts
await Product.find({ $text: { $search: "phone" } });
```

✅ **Tip:**
You can assign weights to prioritize fields:

```ts
productSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 5, description: 1 } }
);
```

---

## 🧠 3.6 Unique Index vs Duplicate Prevention

When you mark a field as `unique: true`, Mongoose **creates a unique index** — but this is **not a validator**, it’s a **database-level constraint**.

Example:

```ts
const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
});
```

If you insert two users with the same email, MongoDB throws:

```
E11000 duplicate key error
```

✅ Use `unique: true` for data integrity
⚠️ Handle `E11000` errors gracefully in your controller.

---

## 🔥 3.7 TTL (Time-To-Live) Indexes

Used for **temporary documents** (like sessions, OTPs, logs).

Example:

```ts
const sessionSchema = new Schema({
  token: String,
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // 1 hour
});
```

After 1 hour, MongoDB automatically deletes the document.
No cron jobs needed! ⏰

---

## 🧩 3.8 Sparse and Partial Indexes

### 🔹 Sparse Index

Indexes only documents with that field present.

Example:

```ts
const userSchema = new Schema({
  phone: { type: String, sparse: true },
});
```

If some users don’t have `phone`, they’ll be skipped.

### 🔹 Partial Index

Indexes only docs matching a condition.

Example:

```ts
userSchema.index({ age: 1 }, { partialFilterExpression: { age: { $gte: 18 } } });
```

Useful for filtering only **active** or **verified** users.

---

## ⚙️ 3.9 How to Analyze Index Usage

You can analyze how MongoDB executes your query using `.explain()`.

```ts
await User.find({ email: "vipin@mail.com" }).explain("executionStats");
```

It shows:

- Which index is used
- How many documents were scanned
- How efficient the query was

✅ **If you see “COLLSCAN”** → No index used → full collection scan
✅ **If you see “IXSCAN”** → Index used → fast lookup

---

## 🧠 3.10 Disable Auto Indexing in Production

Mongoose automatically builds indexes at startup.
This is convenient for dev but **can freeze production servers** if your DB is large.

Disable it in production:

```ts
mongoose.connect(process.env.MONGO_URI!, { autoIndex: false });
```

Then manually build indexes:

```bash
db.users.createIndex({ email: 1 }, { unique: true });
```

---

## ⚡ 3.11 Real-World Example

Let’s design a schema optimized for searching users by name and email.

```ts
const userSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true },
    city: { type: String },
  },
  { timestamps: true }
);

// compound index for combined lookups
userSchema.index({ name: 1, city: 1 });

// text search
userSchema.index({ name: "text", city: "text" });
```

Now queries like:

```ts
await User.find({ name: /vipin/i }).limit(10);
await User.find({ $text: { $search: "Delhi" } });
```

will use the appropriate indexes.

---

## ⚡ 3.12 Index Maintenance Commands

### Check indexes:

```bash
db.users.getIndexes()
```

### Drop an index:

```bash
db.users.dropIndex("name_1_city_1")
```

### Rebuild all indexes:

```bash
db.users.reIndex()
```

---

## 🧮 3.13 Index Best Practices (Production)

| ✅ Do                                  | ❌ Avoid                             |
| -------------------------------------- | ------------------------------------ |
| Index fields used in filtering/sorting | Indexing every field                 |
| Use compound indexes wisely            | Duplicating indexes                  |
| Disable autoIndex in prod              | Creating indexes during peak traffic |
| Use TTL for temporary data             | Using TTL for important logs         |
| Analyze with `.explain()` regularly    | Ignoring query performance           |
| Monitor index size                     | Indexing large arrays                |

---

## 🧠 Summary

| Concept       | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| Index         | A data structure that speeds up queries                     |
| B-Tree        | The internal structure used by MongoDB for indexes          |
| Types         | Single, compound, text, TTL, partial                        |
| Explain       | Tool to analyze how MongoDB executes your queries           |
| Best Practice | Disable autoIndex, monitor index size, use compound smartly |

---

## 🚀 Coming Next: **Point 4 – Data Relationships & Population**

We’ll cover:

- **Embedding vs Referencing (Normalization vs Denormalization)**
- **How `ref` and `populate()` work internally**
- **Virtual populate and reverse relationships**
- **Nested and multi-level population**
- **Performance considerations for joins in MongoDB**

---
