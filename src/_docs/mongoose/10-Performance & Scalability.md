# ⚡ Chapter 10: Performance & Scalability

> “Making your Mongoose + MongoDB app fast, efficient, and scalable in real-world environments.”

---

## 🧠 10.1 Why Performance Matters

In development, Mongoose feels instant.
But at scale (millions of records, concurrent users, background jobs), **poor query design, missing indexes, or unnecessary overhead** can cause major slowdowns.

Optimizing Mongoose for production means:

- Reducing DB load
- Avoiding unnecessary queries
- Using indexes effectively
- Leveraging caching (e.g., Redis)
- Handling sharding & replicas safely

---

## ⚙️ 10.2 Use `.lean()` for Read-Heavy Queries

Mongoose documents have a lot of overhead (getters, virtuals, validation, etc.).
If you only need plain data — **use `.lean()`**.

```ts
await User.find({ isActive: true }).lean();
```

✅ Returns plain JavaScript objects
✅ 2x–5x faster in large queries
⚠️ Does not apply virtuals, getters, or methods

**Use `.lean()` for:**

- API responses
- Read-heavy endpoints
- Aggregation results

---

## 🧩 10.3 Project Only What You Need (`.select()`)

Always select only the required fields — MongoDB still reads everything from disk if you don’t specify.

```ts
await User.find().select("name email -_id").lean();
```

✅ Reduces I/O
✅ Smaller network payload
✅ Improves query performance

---

## 🧠 10.4 Indexing for Speed (Recap)

- Create indexes for frequently filtered or sorted fields.
- Always index unique or searchable fields (email, username, etc.).
- Avoid **over-indexing** (too many = slower writes).

Check existing indexes:

```bash
db.users.getIndexes()
```

Force an index on a query:

```ts
await User.find({ email: "vipin@mail.com" }).hint({ email: 1 });
```

---

## ⚙️ 10.5 Optimize Queries with Filters & Projections

MongoDB performs best when queries are **selective**.
Avoid large scans (`COLLSCAN`).

```ts
await User.find({ isActive: true, age: { $gte: 18 } })
  .select("name email age")
  .sort({ age: -1 })
  .limit(20)
  .lean();
```

✅ Query uses indexes
✅ Limited and projected results
✅ Fast response time

---

## 🧮 10.6 Use Aggregation Pipelines for Heavy Reports

Aggregation is faster for complex queries that combine filtering, grouping, and sorting.

```ts
await Order.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", totalSpent: { $sum: "$amount" } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 5 },
]);
```

✅ Server-side computation
✅ Reduced network data transfer
✅ Ideal for dashboards & analytics

---

## ⚡ 10.7 Batch Operations with `bulkWrite()`

Instead of looping over updates, use one batch operation.

```ts
await User.bulkWrite([
  { updateOne: { filter: { _id: id1 }, update: { $set: { isActive: true } } } },
  { updateOne: { filter: { _id: id2 }, update: { $set: { isActive: false } } } },
]);
```

✅ Reduces round-trips
✅ Great for admin tools or scheduled jobs

---

## 🧠 10.8 Pagination Optimization (Avoid Skip for Large Data)

Instead of `.skip()` which scans the full dataset, use **cursor-based pagination**.

```ts
await User.find({ _id: { $gt: lastUserId } })
  .sort({ _id: 1 })
  .limit(20);
```

✅ Scales better
✅ Consistent performance
✅ Used by most production APIs (e.g., Twitter, GitHub)

---

## ⚙️ 10.9 Using Redis Cache with Mongoose

Caching can dramatically reduce MongoDB load.
Let’s integrate **Redis** for frequently accessed queries.

---

### 1️⃣ Install dependencies

```bash
npm install ioredis
```

---

### 2️⃣ Setup Redis client

```ts
import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: 6379,
});
```

---

### 3️⃣ Cache Middleware for Mongoose Queries

You can wrap your queries in a small caching layer.

```ts
import { redis } from "./redis.js";

async function cachedFind(key: string, queryFn: () => Promise<any>, ttl = 60) {
  const cacheData = await redis.get(key);
  if (cacheData) {
    console.log("📦 Cache hit");
    return JSON.parse(cacheData);
  }

  console.log("⚙️ Cache miss — fetching from DB");
  const result = await queryFn();
  await redis.set(key, JSON.stringify(result), "EX", ttl);
  return result;
}
```

---

### 4️⃣ Use Cached Queries

```ts
const key = `users:active`;
const users = await cachedFind(key, () =>
  User.find({ isActive: true }).select("name email").lean()
);
```

✅ Reuses same data for repeated requests
✅ TTL (time-to-live) ensures freshness
✅ Dramatic performance boost for dashboards & public data

---

### 5️⃣ Cache Invalidation (Optional)

After updates/deletes, invalidate cache:

```ts
await redis.del("users:active");
```

✅ Keeps data consistent with DB

---

## 🧠 10.10 Monitor Performance in Production

### Enable Mongoose debug mode:

```ts
mongoose.set("debug", true);
```

Outputs all queries:

```
Mongoose: users.find({ age: { '$gte': 18 } }, { projection: {} })
```

### Use MongoDB Atlas tools:

- **Performance Advisor** → suggests missing indexes
- **Profiler** → tracks slow queries
- **Metrics dashboard** → visualizes query latency

---

## ⚙️ 10.11 Handle Replica Sets & Sharding

### 🔹 Replica Sets

- Provides **redundancy** & **failover**
- Use connection string with multiple nodes:

  ```
  mongodb+srv://cluster0.mongodb.net/dbname
  ```

- Set `readPreference` for optimal performance:

  ```ts
  mongoose.connect(uri, { readPreference: "secondaryPreferred" });
  ```

### 🔹 Sharding

For very large datasets:

- Split data across shards using a shard key
- Keep queries **targeted** to shard keys
- Avoid `$regex` and `$nin` — can hit all shards

---

## ⚡ 10.12 Caching + Pagination Example (Production API)

```ts
async function getPaginatedUsers(page = 1, limit = 10) {
  const key = `users:page:${page}`;

  return cachedFind(
    key,
    async () => {
      const skip = (page - 1) * limit;
      return await User.find({ isActive: true })
        .select("name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    },
    120
  );
}
```

✅ Pagination + Redis cache
✅ Fresh every 2 minutes
✅ Ideal for listing endpoints

---

## 🧩 10.13 Bulk Caching (Redis + Mongoose Aggregation)

For dashboards or analytics:

```ts
const topCustomers = await cachedFind(
  "top:customers",
  async () => {
    return await Order.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$userId", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
  },
  300
);
```

✅ Cached for 5 minutes
✅ Perfect for leaderboard or admin panels

---

## 🧠 10.14 Production Performance Checklist

| ✅ Do                         | ❌ Avoid                               |
| ----------------------------- | -------------------------------------- |
| Use `.lean()` for reads       | Returning full documents unnecessarily |
| Cache frequent queries        | Hitting MongoDB repeatedly             |
| Limit + paginate              | Returning all documents                |
| Use `bulkWrite()` for batches | Looping multiple `updateOne`           |
| Monitor indexes               | Ignoring performance advisor           |
| Use short-lived transactions  | Long ones block writes                 |
| Enable compression (`zlib`)   | Sending uncompressed payloads          |
| Use `readPreference` wisely   | Always reading from primary            |
| Profile slow queries          | Ignoring performance metrics           |

---

## 🧠 Summary

| Concept       | Description                     |
| ------------- | ------------------------------- |
| `.lean()`     | Fast, lightweight read queries  |
| `.select()`   | Field projection                |
| Indexes       | Improve filter/sort performance |
| `bulkWrite()` | Efficient batch updates         |
| Redis caching | Reduce DB load                  |
| Pagination    | Prevent large result sets       |
| Replica sets  | High availability               |
| Profiling     | Monitor and tune queries        |

---

## 🚀 Coming Next: **Point 11 – Advanced Aggregation**

You’ll learn:

- Deep dive into `$match`, `$group`, `$lookup`, `$facet`, `$unwind`
- Building complex analytics queries
- Combining filters, joins, and projections
- Optimizing aggregation performance
- Real-world analytics examples (e.g., sales reports, user stats)

---
