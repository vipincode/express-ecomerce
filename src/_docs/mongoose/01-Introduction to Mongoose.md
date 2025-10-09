# 🧠 Chapter 1: Introduction to Mongoose

---

## ⚙️ 1.1 What is Mongoose?

**Mongoose** is an **Object Data Modeling (ODM)** library for **MongoDB** and **Node.js**.

It helps you:

- Define schemas with strong typing and validation.
- Interact with MongoDB using a higher-level API (no raw queries).
- Manage relationships, middleware (hooks), virtuals, and transactions easily.
- Integrate cleanly with TypeScript for type-safe models.

Think of it as:

> “An ORM for MongoDB that adds structure, validation, and logic to otherwise schemaless data.”

---

## 🧩 1.2 Why use Mongoose instead of MongoDB driver?

| Feature                      | MongoDB Native Driver              | Mongoose                 |
| ---------------------------- | ---------------------------------- | ------------------------ |
| **Schema Definition**        | ❌ None (you define data manually) | ✅ Schema-based          |
| **Validation**               | ❌ Manual                          | ✅ Built-in & extensible |
| **Relationships (populate)** | ❌ Manual joins                    | ✅ `populate()` built-in |
| **Middleware (hooks)**       | ❌ Manual                          | ✅ Pre/Post hooks        |
| **TypeScript Support**       | ⚠️ Partial                         | ✅ Strong                |
| **Query Builders**           | ✅ Native                          | ✅ Cleaner & abstracted  |
| **Ease of Testing**          | ⚠️ Moderate                        | ✅ Excellent             |

---

## 🧱 1.3 How Mongoose Works

Mongoose sits **between your application and MongoDB**:

```
Your App ⇄ Mongoose (ODM) ⇄ MongoDB Database
```

- You define a **Schema** (the structure of your documents).
- Mongoose compiles that schema into a **Model**.
- You use the Model to **create, read, update, delete** documents.
- Mongoose automatically converts between MongoDB documents ↔ JavaScript objects.

---

## ⚡ 1.4 Installing and Setting Up with TypeScript

**Step 1.** Install packages:

```bash
npm install mongoose
npm install -D @types/mongoose typescript ts-node-dev
```

**Step 2.** Create a basic project structure:

```
src/
 ├─ config/
 │   └─ database.ts
 ├─ models/
 │   └─ user.model.ts
 ├─ index.ts
tsconfig.json
.env
```

**Step 3.** Configure `tsconfig.json` (ESM compatible)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

**Step 4.** Add scripts in `package.json`

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "type": "module"
}
```

---

## 🧰 1.5 Connecting to MongoDB

Create `.env` file:

```
MONGO_URI=mongodb://localhost:27017/mongoose_course
```

Create `src/config/database.ts`

```ts
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string, {
      autoIndex: false, // disable in production for performance
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};
```

Use it in `src/index.ts`:

```ts
import "dotenv/config";
import { connectDB } from "./config/database.js";

const startServer = async () => {
  await connectDB();
  console.log("🚀 Server ready!");
};

startServer();
```

---

## 🔒 1.6 Understanding Mongoose Connection Lifecycle

Mongoose manages **connection pooling** internally — multiple requests reuse a single open connection.

**Events you should listen for (production best practice):**

```ts
import mongoose from "mongoose";

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Connection closed due to app termination");
  process.exit(0);
});
```

✅ **Production Tip:** Always close connections gracefully on shutdown to prevent hanging sockets.

---

## 🧮 1.7 How to Structure a Mongoose + TS Project

Example folder structure:

```
src/
 ├─ config/
 │   └─ database.ts
 ├─ models/
 │   ├─ user.model.ts
 │   └─ product.model.ts
 ├─ controllers/
 │   └─ user.controller.ts
 ├─ routes/
 │   └─ user.route.ts
 ├─ utils/
 │   └─ errorHandler.ts
 └─ index.ts
```

✅ Each model is in its own file
✅ Keep database config separate
✅ Use environment variables for DB URIs and stage separation

---

## 🧩 1.8 Quick Example: User Schema (Preview for Next Chapter)

```ts
import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
```

Usage:

```ts
const user = await User.create({ name: "Vipin", email: "vipin@mail.com", password: "123456" });
console.log(user);
```

---

## 🧠 1.9 Summary

| Concept    | Key Takeaway                                                 |
| ---------- | ------------------------------------------------------------ |
| Mongoose   | ODM for MongoDB – adds schema, validation, and relationships |
| TypeScript | Makes your models type-safe and self-documenting             |
| Connection | Use a single connection instance with pooling                |
| Env Config | Use `.env` and config separation for production              |
| Structure  | Organize by model/controller/route for maintainability       |

---

✅ **Next Chapter (2): Schema Design Fundamentals**

We’ll cover:

- How to create schemas using TypeScript interfaces
- Schema types and options
- Virtuals, default values, required fields
- `timestamps`, `versionKey`, `strict mode`, and more

---
