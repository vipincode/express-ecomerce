Excellent 🔥 — Let’s dive into **Point 2: Schema Design Fundamentals**, one of the most important topics in mastering Mongoose for a **production-ready** application.

Here, we’ll learn not just how to define schemas — but how to **design** them properly, use **TypeScript types**, **schema options**, and understand **how MongoDB and Mongoose work together** under the hood.

---

# 📗 Chapter 2: Schema Design Fundamentals

---

## 🧱 2.1 What Is a Schema in Mongoose?

A **Schema** defines the **structure**, **default values**, and **validation rules** of documents inside a MongoDB collection.

> Think of a schema as the “blueprint” for how each document should look.

Example:

```ts
const userSchema = new Schema({
  name: String,
  email: String,
  age: Number,
});
```

Even though MongoDB is _schemaless_, Mongoose **enforces structure at the application level** — ensuring consistency and predictability.

---

## 🧩 2.2 Creating a Schema in TypeScript

Let’s define a schema for `User` with proper TypeScript typing:

```ts
import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  age?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    age: { type: Number, min: 1, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
    versionKey: false, // removes the "__v" version key
  }
);

export const User = model<IUser>("User", userSchema);
```

### 💡 Notes:

- `Document` extends the MongoDB document type — so your model has full typing support.
- Mongoose automatically adds `_id` of type `ObjectId` to each schema.

---

## ⚙️ 2.3 Schema Options Explained

Mongoose schemas accept an **options object** (2nd parameter of `new Schema()`).

Example:

```ts
new Schema({...}, {
  timestamps: true,
  versionKey: false,
  strict: true,
  minimize: false,
  collection: "users_collection"
});
```

| Option               | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `timestamps`         | Adds `createdAt` & `updatedAt` fields automatically  |
| `versionKey`         | Adds or disables the `__v` key used for versioning   |
| `strict`             | Ensures only defined fields are saved in DB          |
| `minimize`           | Removes empty objects by default; `false` keeps them |
| `collection`         | Explicitly sets MongoDB collection name              |
| `toJSON`, `toObject` | Define custom transformations on output              |

---

## 🧠 2.4 Understanding SchemaTypes

Each field in a schema has a **type** that determines what kind of value it stores.

| Type       | Example                                                  | Description                              |
| ---------- | -------------------------------------------------------- | ---------------------------------------- |
| `String`   | `{ name: String }`                                       | For text data                            |
| `Number`   | `{ age: Number }`                                        | For integers/floats                      |
| `Date`     | `{ dob: Date }`                                          | For date-time                            |
| `Boolean`  | `{ isActive: Boolean }`                                  | For true/false                           |
| `ObjectId` | `{ user: { type: Schema.Types.ObjectId, ref: "User" } }` | For relationships                        |
| `Array`    | `{ tags: [String] }`                                     | For list of values                       |
| `Map`      | `{ metadata: { type: Map, of: String } }`                | For dynamic key-value pairs              |
| `Mixed`    | `{ anyData: Schema.Types.Mixed }`                        | For unstructured JSON (⚠️ use carefully) |

---

## 🧩 2.5 Required, Default, Unique, and Immutable Fields

Let’s make our schema more robust:

```ts
const userSchema = new Schema<IUser>({
  name: { type: String, required: [true, "Name is required"] },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true, select: false },
  age: { type: Number, min: 1, max: 120 },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  isVerified: { type: Boolean, default: false, immutable: true },
});
```

✅ **Explanation:**

- `required`: Validates the field exists before save.
- `default`: Sets a fallback value if not provided.
- `unique`: Creates a unique **index** (helps search + prevents duplicates).
- `immutable`: Field value cannot be changed after creation.

---

## 🧮 2.6 Timestamps and Versioning

Mongoose can automatically manage **createdAt** and **updatedAt** fields:

```ts
const schema = new Schema({...}, { timestamps: true });
```

If you want to **customize** their field names:

```ts
{ timestamps: { createdAt: 'created_on', updatedAt: 'updated_on' } }
```

Disable version key (`__v`) with:

```ts
{
  versionKey: false;
}
```

---

## 📊 2.7 Using Custom Validators

You can add validation directly in schema definition:

```ts
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => /\S+@\S+\.\S+/.test(value),
      message: "Invalid email format",
    },
  },
});
```

Or use async validation:

```ts
username: {
  type: String,
  validate: {
    validator: async function (v: string) {
      const count = await User.countDocuments({ username: v });
      return count === 0;
    },
    message: "Username already exists",
  },
}
```

---

## 🔧 2.8 Strict Mode and Flexible Fields

By default, `strict: true` ensures only fields defined in the schema are saved.

Example:

```ts
const userSchema = new Schema({ name: String }, { strict: true });
```

When saving:

```ts
await User.create({ name: "Vipin", extra: "not allowed" });
```

Result → only `{ name: "Vipin" }` will be stored.

If you set `strict: false`, all fields are saved.

You can also set `strict: "throw"` to throw an error for unknown fields.

---

## ⚡ 2.9 Example: Full Schema (with TypeScript)

```ts
import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  age?: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    age: { type: Number, min: 1, max: 100 },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

export const User = model<IUser>("User", userSchema);
```

---

## 🧮 2.10 Real-World Design Considerations

✅ **Good practices for schema design:**

1. **Keep documents small (< 16MB)** — split large structures.
2. **Embed data** only when tightly coupled (e.g., address inside user).
3. **Reference data** when loosely coupled (e.g., user → posts).
4. **Use `enum` and validators** to enforce data integrity.
5. **Index fields** you frequently query on.
6. **Disable autoIndex in production** and create indexes manually.
7. **Avoid deeply nested objects** — difficult to query efficiently.
8. **Set `strict: true`** to prevent garbage fields in DB.

---

## 🧠 Summary

| Concept     | Description                                              |
| ----------- | -------------------------------------------------------- |
| Schema      | Defines the structure of your MongoDB documents          |
| SchemaTypes | Define what kind of data each field holds                |
| Options     | Customize behavior (timestamps, versioning, strict mode) |
| Validation  | Ensures data integrity before saving                     |
| Indexing    | Optimize search and uniqueness                           |
| TypeScript  | Gives type safety to models and queries                  |

---

## 🚀 Coming Next: **Point 3 – Indexing & Query Performance**

You’ll learn:

- How **indexes** actually work in MongoDB
- How to create them in Mongoose (`schema.index()`)
- How to analyze queries with `.explain()`
- How to balance **speed vs memory cost**
- Real-world examples for text and compound search

---
