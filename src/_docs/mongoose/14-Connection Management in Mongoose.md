## 🧩 13.1 Why Connection Management Matters

By default, Mongoose opens a single connection to MongoDB and **keeps it open** for reuse.

In production:

- Apps run on multiple threads/processes
- DB connections are limited
- Connection leaks can crash the database
- You may need multiple databases (e.g. users vs logs)

Proper connection management ensures:
✅ Stability
✅ Performance
✅ Scalability

---

## ⚙️ 13.2 Basic Connection Setup

In your project (e.g. `src/db/connection.ts`):

```ts
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI as string;

    await mongoose.connect(uri, {
      autoIndex: false, // recommended in production
      maxPoolSize: 10, // limit concurrent connections
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
```

✅ Automatically connects
✅ Uses pooling
✅ Fails fast if MongoDB is unreachable

---

## 🧠 13.3 What Is Connection Pooling?

- A **connection pool** is a set of open, reusable connections between your app and MongoDB.
- Mongoose manages a pool automatically.

| Option               | Description                                         | Default |
| -------------------- | --------------------------------------------------- | ------- |
| `maxPoolSize`        | Max number of connections in the pool               | 100     |
| `minPoolSize`        | Minimum idle connections kept alive                 | 0       |
| `maxIdleTimeMS`      | How long to keep an idle connection                 | 10000   |
| `waitQueueTimeoutMS` | How long to wait for a connection before timing out | 5000    |

✅ Keeps your API performant under high load
✅ Prevents “too many connections” errors

---

## ⚙️ 13.4 Handling Connection Events

You can listen for important connection events to monitor DB health:

```ts
const db = mongoose.connection;

db.on("connected", () => console.log("🟢 MongoDB connected"));
db.on("error", (err) => console.error("🔴 MongoDB error:", err));
db.on("disconnected", () => console.warn("🟠 MongoDB disconnected"));
db.on("reconnected", () => console.log("🟢 MongoDB reconnected"));
```

✅ Useful for health checks and monitoring tools like PM2 or Kubernetes

---

## 🧩 13.5 Graceful Shutdown (SIGINT, SIGTERM)

Always close your database connection properly before the process exits — otherwise you risk **open socket leaks**.

```ts
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔒 MongoDB connection closed due to app termination");
  process.exit(0);
});
```

✅ Prevents data corruption
✅ Frees connections back to MongoDB

---

## ⚡ 13.6 Connecting to Multiple Databases

Sometimes, you might want to store data in **different databases**:

- `users` in one DB
- `logs` or `analytics` in another

### Example:

```ts
const userConnection = mongoose.createConnection(process.env.MONGO_USER_URI!);
const logConnection = mongoose.createConnection(process.env.MONGO_LOG_URI!);

const User = userConnection.model("User", userSchema);
const Log = logConnection.model("Log", logSchema);
```

✅ Each connection has its own pool and lifecycle.
✅ Prevents interference between transactional and non-critical data.

---

## 🧠 13.7 Sharing a Single Connection Across Models

When you use `mongoose.connect()`, it creates a _default global connection_.
All models created with `mongoose.model()` share that connection automatically.

Example:

```ts
import mongoose from "mongoose";
mongoose.connect(process.env.MONGO_URI!);

const userSchema = new mongoose.Schema({ name: String });
const User = mongoose.model("User", userSchema);
```

✅ Simple for most apps
⚠️ Use named connections (`createConnection`) when you need DB isolation

---

## ⚙️ 13.8 Retry Logic on Connection Failures

In production (especially on cloud hosts), transient network failures happen.
You should retry failed connections automatically.

Example:

```ts
async function connectWithRetry() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("⚠️ MongoDB connection failed, retrying in 5s...");
    setTimeout(connectWithRetry, 5000);
  }
}

connectWithRetry();
```

✅ Keeps your app self-healing

---

## ⚡ 13.9 Monitoring Connection State

You can check the current connection state at any time:

```ts
switch (mongoose.connection.readyState) {
  case 0:
    console.log("🔴 Disconnected");
    break;
  case 1:
    console.log("🟢 Connected");
    break;
  case 2:
    console.log("🟡 Connecting");
    break;
  case 3:
    console.log("🟠 Disconnecting");
    break;
}
```

---

## 🧩 13.10 Connection in Microservices or Worker Environments

If you’re using background jobs (e.g., BullMQ, Agenda, or RabbitMQ consumers),
each worker **must manage its own MongoDB connection**.

Example for a worker file:

```ts
import mongoose from "mongoose";

export const initWorkerDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI!, { maxPoolSize: 5 });
    console.log("⚙️ Worker MongoDB connected");
  }
};
```

✅ Keeps each service independent
✅ Avoids global connection pollution

---

## 🧠 13.11 Production Best Practices

| ✅ Do                                              | ❌ Don’t                                   |
| -------------------------------------------------- | ------------------------------------------ |
| Use `maxPoolSize` to limit connections             | Let every request open a new connection    |
| Close connections on shutdown                      | Ignore SIGINT/SIGTERM events               |
| Use `mongoose.createConnection()` for multiple DBs | Mix unrelated schemas in one DB            |
| Retry on connection failure                        | Crash immediately on transient errors      |
| Disable `autoIndex` in production                  | Let Mongoose auto-build indexes at startup |
| Use monitoring tools                               | Ignore DB connection metrics               |

---

## 🧩 13.12 Example: Full Production Connection Utility

```ts
import mongoose from "mongoose";

export const initMongo = async () => {
  const uri = process.env.MONGO_URI!;
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      autoIndex: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected");

    mongoose.connection.on("disconnected", () => console.log("🟠 MongoDB disconnected"));
    mongoose.connection.on("reconnected", () => console.log("🟢 MongoDB reconnected"));
  } catch (err) {
    console.error("❌ MongoDB connection failed", err);
    setTimeout(initMongo, 5000);
  }

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("🔒 Connection closed gracefully");
    process.exit(0);
  });
};
```

✅ Handles retry, reconnection, and graceful shutdown automatically.

---

## ⚙️ 13.13 Connection Architecture Diagram

```
┌───────────────────────────────┐
│        Express / API          │
│  ──────────────────────────   │
│   import { connectDB }        │
│   await connectDB()           │
└──────────────┬────────────────┘
               │
               ▼
      ┌────────────────┐
      │ Mongoose Pool  │
      │  maxPoolSize=10│
      └──────┬─────────┘
             │
             ▼
   ┌────────────────────┐
   │ MongoDB Cluster /  │
   │ Replica Set        │
   └────────────────────┘
```

✅ Efficient, pooled connections
✅ Automatic recovery
✅ Centralized management

---

## 🧠 Summary

| Concept                       | Description                                |
| ----------------------------- | ------------------------------------------ |
| Connection pooling            | Keeps reusable connections open            |
| `mongoose.connect()`          | Global default connection                  |
| `mongoose.createConnection()` | Separate, isolated connection              |
| Graceful shutdown             | Close DB before exiting                    |
| Retry logic                   | Reconnect on transient failures            |
| Multiple DBs                  | Different URIs for different models        |
| Events                        | Listen for connect/disconnect/reconnect    |
| Best Practice                 | One connection per service or microservice |

---

## 🚀 Coming Next: **Point 14 – Indexing & Query Performance Tuning (Advanced)**

We’ll cover:

- Advanced compound indexes (`{ field1: 1, field2: -1 }`)
- Text and geospatial indexes
- Partial & sparse indexes
- Query planning with `.explain("executionStats")`
- Avoiding full collection scans
- Real-world examples of tuning queries

---
