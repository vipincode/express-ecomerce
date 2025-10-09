## 🧠 14.1 What Is an Index?

An **index** is a data structure (like a sorted list) that allows MongoDB to find data **faster** without scanning every document in a collection.

Think of it like the **index in a book**:

- Without it: you read every page to find a topic.
- With it: you jump directly to the right page.

---

### ⚙️ Example Without Index (COLLSCAN)

MongoDB checks **every document** to find matches — slow!

```
db.users.find({ email: "vipin@mail.com" })
```

Plan:

```
"stage": "COLLSCAN"
"docsExamined": 100000
```

### ⚡ Example With Index (IXSCAN)

MongoDB jumps directly to the matching document.

```
db.users.createIndex({ email: 1 })
```

Now:

```
"stage": "IXSCAN"
"docsExamined": 1
```

✅ Query is **instant** — from 100k scans → 1 lookup.

---

## 🧩 14.2 Creating Indexes in Mongoose

You can define indexes **at the schema level**.

```ts
const userSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  city: String,
  age: Number,
});

// Single field index
userSchema.index({ email: 1 });
```

✅ Automatically builds an ascending index on `email`.

---

### Compound Indexes

```ts
userSchema.index({ city: 1, age: -1 });
```

✅ Sorts first by `city` (ascending), then by `age` (descending).

Use this when queries combine multiple fields:

```ts
User.find({ city: "Delhi" }).sort({ age: -1 });
```

---

## ⚡ 14.3 Index Types

| Index Type                | Description                             | Example                                                          |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| **Single Field**          | Index on one field                      | `{ email: 1 }`                                                   |
| **Compound**              | Multi-field index                       | `{ city: 1, age: -1 }`                                           |
| **Unique**                | Enforces uniqueness                     | `{ email: 1 }, { unique: true }`                                 |
| **Text**                  | For full-text search                    | `{ description: "text" }`                                        |
| **Sparse**                | Only index documents with field present | `{ email: 1 }, { sparse: true }`                                 |
| **Partial**               | Index subset of documents               | `{ status: 1 }, { partialFilterExpression: { isActive: true } }` |
| **Geospatial (2dsphere)** | For map coordinates                     | `{ location: "2dsphere" }`                                       |

---

## 🧮 14.4 Checking Existing Indexes

```js
db.users.getIndexes();
```

Example output:

```json
[
  { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
  { "v": 2, "key": { "email": 1 }, "name": "email_1", "unique": true }
]
```

---

## ⚙️ 14.5 Forcing MongoDB to Use an Index

```ts
await User.find({ email: "vipin@mail.com" }).hint({ email: 1 });
```

✅ Ensures your query uses the `email` index.
⚠️ Use sparingly — hints override MongoDB’s optimizer.

---

## 🧠 14.6 Text Search Index

Text indexes enable powerful search across string fields.

```ts
userSchema.index({ name: "text", city: "text" });

const results = await User.find({ $text: { $search: "Delhi" } });
```

MongoDB automatically tokenizes and matches partial text.

---

## 🧩 14.7 Geospatial Index Example

For location-based queries:

```ts
const placeSchema = new Schema({
  name: String,
  location: { type: { type: String }, coordinates: [Number] },
});
placeSchema.index({ location: "2dsphere" });

// Query nearby places
await Place.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [77.209, 28.6139] },
      $maxDistance: 2000, // 2 km
    },
  },
});
```

✅ Used for maps, delivery zones, nearby stores, etc.

---

## ⚡ 14.8 Partial Indexes

You can index **only part of a collection** for faster writes.

```ts
userSchema.index({ isActive: 1 }, { partialFilterExpression: { isActive: true } });
```

✅ Saves index space
✅ Ideal when only a subset of data is queried often

---

## 🧩 14.9 Sparse Indexes

Sparse indexes **ignore missing fields** — perfect when some documents lack a field.

```ts
userSchema.index({ email: 1 }, { sparse: true });
```

✅ Prevents MongoDB from indexing documents without `email`
⚠️ Does not enforce uniqueness across missing fields

---

## 🧮 14.10 Disabling Auto-Indexing in Production

By default, Mongoose builds all indexes at app startup — which can slow down startup time in production.

Disable it:

```ts
mongoose.connect(MONGO_URI, { autoIndex: false });
```

Then manually build indexes:

```ts
await User.syncIndexes();
```

✅ Build once, not on every deploy
✅ Safe for high-load production apps

---

## ⚙️ 14.11 Inspecting Query Performance with `.explain()`

`.explain()` shows how MongoDB executed your query.

Example:

```ts
await User.find({ email: "vipin@mail.com" }).explain("executionStats");
```

Result (simplified):

```json
{
  "queryPlanner": { "winningPlan": { "stage": "IXSCAN" } },
  "executionStats": {
    "executionTimeMillis": 2,
    "totalKeysExamined": 1,
    "totalDocsExamined": 1
  }
}
```

✅ `IXSCAN` = used an index (fast)
❌ `COLLSCAN` = full scan (slow)

---

## 🧠 14.12 Real Example: Slow Query → Optimized Query

**Before:**

```ts
await User.find({ city: "Delhi", age: { $gte: 30 } });
```

Explain:

```
"stage": "COLLSCAN"
"docsExamined": 50000
```

Add a compound index:

```ts
userSchema.index({ city: 1, age: 1 });
await User.syncIndexes();
```

After:

```
"stage": "IXSCAN"
"docsExamined": 10
```

✅ Query time reduced from **~150ms → ~3ms**

---

## ⚙️ 14.13 Index Performance Trade-offs

| Pros                    | Cons                                                 |
| ----------------------- | ---------------------------------------------------- |
| Faster reads            | Slower writes (indexes must update on insert/update) |
| Smaller query load      | More RAM usage                                       |
| Efficient sorting       | Increased disk storage                               |
| Enables complex filters | More complex maintenance                             |

✅ Only index what you actually query or sort by frequently.

---

## 🧠 14.14 Production Indexing Strategy

| ✅ Do                                     | ❌ Don’t                                        |
| ----------------------------------------- | ----------------------------------------------- |
| Create indexes on filter/sort fields      | Index every field                               |
| Use compound indexes for combined filters | Use multiple single-field indexes unnecessarily |
| Monitor with `.explain()`                 | Guess query performance                         |
| Disable `autoIndex` in production         | Let Mongoose build automatically at startup     |
| Rebuild indexes off-peak                  | Rebuild during peak load                        |

---

## ⚙️ 14.15 Real-World Example (Analytics System)

```ts
const analyticsSchema = new Schema({
  userId: Schema.Types.ObjectId,
  event: String,
  createdAt: Date,
});

// Optimize frequent queries by time + user
analyticsSchema.index({ userId: 1, createdAt: -1 });
```

Query:

```ts
await Analytics.find({ userId, createdAt: { $gte: last24Hours } })
  .sort({ createdAt: -1 })
  .limit(50)
  .lean();
```

✅ Uses compound index efficiently for both filter + sort
✅ Perfect for event logs, audit trails, or timelines

---

## 🧠 14.16 Quick Reference — `.explain()` Stages

| Stage            | Meaning                     | Speed                   |
| ---------------- | --------------------------- | ----------------------- |
| `COLLSCAN`       | Full collection scan        | 🐢 Slow                 |
| `IXSCAN`         | Index scan                  | ⚡ Fast                 |
| `FETCH`          | Retrieved indexed documents | ⚡                      |
| `SORT`           | In-memory sort              | 🐢 Avoid, index instead |
| `PROJECTION`     | Field selection             | ✅ Lightweight          |
| `LIMIT` / `SKIP` | Pagination stages           | ⚡ Efficient with index |

---

## 🧠 Summary

| Concept                | Description                                   |
| ---------------------- | --------------------------------------------- |
| Index                  | Data structure for fast query lookup          |
| Single Index           | One field (e.g., `{ email: 1 }`)              |
| Compound Index         | Multiple fields                               |
| Text Index             | For full-text search                          |
| Sparse Index           | Skips missing fields                          |
| Partial Index          | Index subset of data                          |
| `.explain()`           | Analyze query performance                     |
| `COLLSCAN` vs `IXSCAN` | Full scan vs index scan                       |
| Best Practice          | Index fields used in filters, sorts, or joins |

---

## 🚀 Coming Next: **Point 15 – Security, Validation & Data Protection**

We’ll cover:

- Preventing NoSQL Injection & query tampering
- Field-level encryption and projection
- Secure schema design (hiding sensitive fields)
- Schema-based validation and sanitization
- Rate limiting and audit logging for Mongoose APIs

---
