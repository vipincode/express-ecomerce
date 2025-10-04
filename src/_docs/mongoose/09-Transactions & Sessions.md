Perfect ⚡ — now we’ve arrived at one of the _most advanced and production-critical_ Mongoose topics:

# 📙 Chapter 9: Transactions & Sessions

> “Ensuring **atomicity** and **data consistency** across multiple collections.”

---

## 🧠 9.1 What Are Transactions?

A **transaction** is a way to execute multiple database operations **as a single atomic unit**.
If one operation fails, the **entire transaction rolls back** — leaving your database unchanged.

> All or nothing ✅ — either **everything succeeds** or **nothing is applied**.

---

### Example Scenario

Let’s say your app does this:

1. Create a **user**
2. Create a **wallet** for that user
3. Add an **initial balance**

If any step fails (e.g., wallet creation), you want **both documents** to roll back.

That’s exactly what **transactions** and **MongoDB sessions** provide.

---

## ⚙️ 9.2 Prerequisites

- Your MongoDB must be a **replica set** or **Atlas cluster** (transactions aren’t supported in standalone mode).
- Use **MongoDB v4.0+**
- Mongoose v5.2+ for full transaction support.

---

## 🧩 9.3 Basic Transaction Workflow

```ts
const session = await mongoose.startSession();
session.startTransaction();

try {
  // operations inside transaction
  await User.create([{ name: "Vipin" }], { session });
  await Wallet.create([{ userId: user._id, balance: 0 }], { session });

  await session.commitTransaction(); // ✅ commit
  console.log("Transaction committed");
} catch (error) {
  await session.abortTransaction(); // ❌ rollback
  console.error("Transaction aborted:", error);
} finally {
  session.endSession();
}
```

✅ All DB writes inside the transaction share the same session.
✅ If one fails → everything rolls back.

---

## 🧠 9.4 Transaction Methods

| Method                        | Description                              |
| ----------------------------- | ---------------------------------------- |
| `startSession()`              | Starts a new session                     |
| `session.startTransaction()`  | Begins a transaction                     |
| `session.commitTransaction()` | Commits all operations                   |
| `session.abortTransaction()`  | Rolls back everything                    |
| `session.endSession()`        | Ends the session (must always be called) |

---

## ⚙️ 9.5 Example: User + Wallet Creation (Atomic)

```ts
import mongoose from "mongoose";
import { User } from "./models/user.model.js";
import { Wallet } from "./models/wallet.model.js";

export async function createUserAndWallet() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.create([{ name: "Vipin", email: "vipin@mail.com" }], { session });
    const wallet = await Wallet.create([{ userId: user[0]._id, balance: 100 }], { session });

    await session.commitTransaction();
    console.log("✅ Transaction success:", user[0].name);
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Transaction failed:", err);
  } finally {
    session.endSession();
  }
}
```

✅ Both collections (`User` & `Wallet`) are modified atomically.
❌ If either fails, both roll back.

---

## 🧩 9.6 Using Transactions with `withTransaction()`

A cleaner API for automatic retry handling:

```ts
await mongoose.connection.transaction(async (session) => {
  const user = await User.create([{ name: "Vipin" }], { session });
  const wallet = await Wallet.create([{ userId: user[0]._id, balance: 500 }], { session });
});
```

`withTransaction()` automatically:

- Starts and commits the transaction
- Aborts and retries on transient errors

✅ Production-safe
✅ Less boilerplate

---

## ⚙️ 9.7 Multi-Document Updates Example

Imagine transferring money between two users:

```ts
const session = await mongoose.startSession();
session.startTransaction();

try {
  const sender = await Wallet.findOneAndUpdate(
    { userId: senderId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true, session }
  );

  if (!sender) throw new Error("Insufficient balance");

  await Wallet.findOneAndUpdate(
    { userId: receiverId },
    { $inc: { balance: amount } },
    { new: true, session }
  );

  await session.commitTransaction();
  console.log("✅ Transfer successful");
} catch (err) {
  await session.abortTransaction();
  console.error("❌ Transfer failed:", err);
} finally {
  session.endSession();
}
```

✅ Both balance updates happen together
✅ If sender has insufficient funds → rollback

---

## 🧠 9.8 Transactions with Mongoose Models and `save()`

When using `.save()`, you must explicitly attach the session:

```ts
const session = await mongoose.startSession();
session.startTransaction();

try {
  const user = new User({ name: "Vipin" });
  await user.save({ session });

  const profile = new Profile({ userId: user._id });
  await profile.save({ session });

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
} finally {
  session.endSession();
}
```

---

## ⚡ 9.9 Error Handling & Rollback

Always handle transactions with `try/catch/finally` and ensure:

1. `abortTransaction()` is called on error
2. `endSession()` always runs
3. Never reuse sessions between independent requests

```ts
try {
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}
```

✅ Ensures clean session state
✅ Prevents transaction leaks

---

## 🧮 9.10 Nesting Transactions (Best Practice)

MongoDB **does not support nested transactions**,
but you can reuse a session in nested function calls.

Example:

```ts
async function createUser(data, session) {
  return User.create([data], { session });
}

async function createWallet(userId, session) {
  return Wallet.create([{ userId, balance: 0 }], { session });
}

async function registerUser(data) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await createUser(data, session);
    await createWallet(user[0]._id, session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}
```

✅ Cleaner modular design
✅ Same session ensures atomicity

---

## 🧠 9.11 Common Transaction Mistakes

| Mistake                                 | Result                             | Fix                                |
| --------------------------------------- | ---------------------------------- | ---------------------------------- |
| Forgetting `{ session }` in model calls | Operation runs outside transaction | Always include `{ session }`       |
| Using `insertMany()` without session    | No rollback on failure             | Pass `{ session }`                 |
| Using standalone MongoDB server         | Transaction won’t work             | Use replica set or Atlas           |
| Forgetting `endSession()`               | Memory leak                        | Always call `session.endSession()` |
| Mixing sessions between users           | Data corruption                    | One session per transaction only   |

---

## ⚙️ 9.12 Real-World Example: Signup + Wallet Creation

```ts
import { User } from "./models/user.model.js";
import { Wallet } from "./models/wallet.model.js";
import mongoose from "mongoose";

export const registerUser = async (data: { name: string; email: string }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.create([{ name: data.name, email: data.email }], { session });
    await Wallet.create([{ userId: user[0]._id, balance: 0 }], { session });

    await session.commitTransaction();
    return { success: true, user: user[0] };
  } catch (err) {
    await session.abortTransaction();
    return { success: false, error: err };
  } finally {
    session.endSession();
  }
};
```

✅ Both documents either save or roll back
✅ Production-safe and scalable

---

## 🧠 9.13 Performance Tips

| Tip                                             | Why                                 |
| ----------------------------------------------- | ----------------------------------- |
| Keep transactions **short-lived**               | Locks resources during execution    |
| Avoid long-running queries inside a transaction | Can cause lock timeouts             |
| Use **retry logic** on transient errors         | Network or replication delays       |
| Don’t use `populate()` inside transactions      | Slower and may break consistency    |
| Monitor with MongoDB Atlas metrics              | Detect slow or aborted transactions |

---

## 🧮 9.14 Example Rollback in Practice

If you add a logging system:

```ts
try {
  await User.create([{ name: "Test" }], { session });
  throw new Error("Something failed");
  await Log.create([{ message: "This should rollback" }], { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction(); // Both user & log are removed
}
```

✅ No partial data remains after rollback

---

## 🧠 Summary

| Concept           | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| Session           | A context that keeps operations grouped together            |
| Transaction       | Ensures atomicity for multi-document operations             |
| commitTransaction | Applies all changes                                         |
| abortTransaction  | Rolls back all changes                                      |
| withTransaction   | Clean, retryable API for production                         |
| Best Practice     | One session per request, short transactions, proper cleanup |

---

## 🚀 Coming Next: **Point 10 – Performance & Scalability**

We’ll cover:

- Optimizing queries with `.lean()`, projections, and indexes
- Using bulk operations for batch updates
- Handling sharding and replica sets
- Caching with Redis + Mongoose
- Performance monitoring and metrics

---
