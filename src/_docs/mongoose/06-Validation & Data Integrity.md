Perfect 🔥 — now we’re entering **Point 6: Validation & Data Integrity**, one of the _most critical topics_ in building a **production-ready Mongoose application**.

Validation is your **first line of defense** against bad data — ensuring your database stays clean, consistent, and predictable.
In this chapter, we’ll master how to **validate data using Mongoose**, create **custom & async validators**, and integrate external libraries like **Zod or Joi** for stronger type validation.

---

# 📙 Chapter 6: Validation & Data Integrity

---

## 🧩 6.1 Why Validation Matters

MongoDB is **schemaless** — it won’t stop you from inserting incomplete or invalid data.

That’s why **Mongoose enforces validation** at the _application level_, ensuring every document you save conforms to the defined schema.

✅ Prevents bad data
✅ Ensures business rules
✅ Avoids inconsistent documents
✅ Protects API reliability

---

## ⚙️ 6.2 Built-in Validators

Mongoose includes common validators for most SchemaTypes.

Example:

```ts
const userSchema = new Schema({
  name: { type: String, required: true, minlength: 3, maxlength: 50 },
  email: { type: String, required: true, match: /\S+@\S+\.\S+/ },
  age: { type: Number, min: 18, max: 60 },
  role: { type: String, enum: ["user", "admin"] },
});
```

| Validator                 | Field Type      | Example                         |
| ------------------------- | --------------- | ------------------------------- |
| `required`                | all             | `{ required: true }`            |
| `minlength` / `maxlength` | String          | `{ minlength: 5 }`              |
| `min` / `max`             | Number / Date   | `{ min: 0, max: 100 }`          |
| `match`                   | String (RegExp) | `{ match: /regex/ }`            |
| `enum`                    | String / Number | `{ enum: ['pending', 'done'] }` |

---

## 🧠 6.3 Custom Validators

You can define **custom synchronous or asynchronous** validation functions.

### 🔹 Synchronous Example

```ts
const userSchema = new Schema({
  username: {
    type: String,
    validate: {
      validator: (v: string) => /^[a-zA-Z0-9_]+$/.test(v),
      message: "Username must be alphanumeric",
    },
  },
});
```

---

### 🔹 Asynchronous Example (e.g., check duplicates)

```ts
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    validate: {
      validator: async function (email: string) {
        const count = await this.model("User").countDocuments({ email });
        return count === 0;
      },
      message: "Email already exists",
    },
  },
});
```

✅ **Tip:** async validators are perfect for checks that depend on database lookups.

---

## ⚡ 6.4 Validation Triggers

Mongoose runs validation automatically in these cases:

| Operation                              | Validation runs?                           |
| -------------------------------------- | ------------------------------------------ |
| `.save()`                              | ✅ Yes                                     |
| `.create()`                            | ✅ Yes                                     |
| `.insertMany()`                        | ❌ No (use `{ validateBeforeSave: true }`) |
| `.updateOne()` / `.findOneAndUpdate()` | ❌ No (unless `{ runValidators: true }`)   |

Example:

```ts
await User.updateOne({ _id }, { age: -5 }, { runValidators: true });
```

---

## 🔍 6.5 Pre-Save Validation Middleware

You can use `pre('save')` hooks for advanced logic:

```ts
userSchema.pre("save", function (next) {
  if (this.age < 18) {
    next(new Error("User must be 18+"));
  } else {
    next();
  }
});
```

✅ Use for business rules, password hashing, etc.

---

## 🧰 6.6 Schema-Level vs Request-Level Validation

| Level                       | Type                           | Example Use            | Pros                    | Cons                 |
| --------------------------- | ------------------------------ | ---------------------- | ----------------------- | -------------------- |
| **Schema-level (Mongoose)** | Validation before saving to DB | Required, regex, range | Fast, centralized       | Tied to DB layer     |
| **Request-level (Zod/Joi)** | Validate API input             | Request body           | Reusable, more flexible | Extra step before DB |

---

## ⚙️ 6.7 Integrating Zod or Joi (External Validation)

### Example using **Zod**:

```ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(60),
  role: z.enum(["user", "admin"]),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
```

In your controller:

```ts
const parsed = createUserSchema.parse(req.body);
const user = await User.create(parsed);
```

✅ Validate before reaching MongoDB
✅ Great for API routes or Express middlewares

---

## 🧮 6.8 Handling Validation Errors

When validation fails, Mongoose throws a `ValidationError`.

Example:

```ts
try {
  await User.create({ email: "invalid", age: 15 });
} catch (err: any) {
  if (err.name === "ValidationError") {
    console.error(err.message);
  }
}
```

Example output:

```
ValidationError: User validation failed: email: invalid email, age: Path `age` (15) is less than minimum allowed value (18).
```

---

## 🧱 6.9 Default Values & Immutable Fields

```ts
const userSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "user", immutable: true },
});
```

✅ Default values auto-apply on create
✅ Immutable prevents updates after initial save

---

## 🧠 6.10 Conditional Validation (Context-Based Rules)

You can apply conditional logic inside a validator:

```ts
const productSchema = new Schema({
  discount: {
    type: Number,
    validate: {
      validator: function (v: number) {
        return v < this.price;
      },
      message: "Discount must be less than price",
    },
  },
  price: { type: Number, required: true },
});
```

---

## ⚙️ 6.11 Real-World Example: User Schema with Validation

```ts
import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  age?: number;
  role: "user" | "admin";
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, minlength: 3, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /\S+@\S+\.\S+/,
    },
    password: { type: String, required: true, minlength: 8 },
    age: { type: Number, min: 18, max: 60 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// Pre-save check
userSchema.pre("save", function (next) {
  if (!this.email.includes("@")) {
    next(new Error("Invalid email"));
  } else {
    next();
  }
});

export const User = model<IUser>("User", userSchema);
```

---

## 🧩 6.12 Production Validation Tips

| ✅ Best Practice                                          | 💡 Why                       |
| --------------------------------------------------------- | ---------------------------- |
| Always validate both at **request** and **schema** level  | Defense in depth             |
| Use **async validators** sparingly                        | Too many can slow writes     |
| Disable `autoIndex` in production                         | Avoid rebuild during startup |
| Sanitize user input                                       | Prevent NoSQL injection      |
| Catch `ValidationError` and return user-friendly messages | Better UX                    |
| Keep validation messages meaningful                       | Easier debugging             |

---

## 🧠 Summary

| Concept             | Description                       |
| ------------------- | --------------------------------- |
| Built-in validators | Required, enum, min/max, match    |
| Custom validation   | Use validator functions           |
| Async validation    | Useful for uniqueness checks      |
| Pre-save validation | Business logic before saving      |
| External validation | Zod/Joi for request input         |
| runValidators       | Ensures updates follow rules      |
| Error handling      | Use try/catch for ValidationError |

---

## 🚀 Coming Next: **Point 7 – Querying Data in Mongoose**

We’ll cover:

- All query helpers (`find`, `findOne`, `findById`, `countDocuments`, etc.)
- Chaining queries (`select`, `sort`, `skip`, `limit`)
- Filtering with operators (`$gte`, `$in`, `$regex`, `$or`, `$and`)
- Pagination & projections
- Query optimization using `.lean()` and `.explain()`
- Real-world examples with filtering, searching, and pagination

---
