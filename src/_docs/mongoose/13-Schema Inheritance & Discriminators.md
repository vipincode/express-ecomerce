Awesome ⚡ — now we’re moving into a very interesting and advanced MongoDB + Mongoose topic — **Schema Inheritance & Discriminators**.

This feature allows you to create **different models that share a common base schema**, perfect for handling **multiple user roles, polymorphic documents, or type variations** — all within a single collection.

---

# 📗 Chapter 12: Schema Inheritance & Discriminators

---

## 🧠 12.1 What Are Discriminators?

A **discriminator** in Mongoose is a way to create **sub-models that inherit from a base model**, while keeping all documents inside **one collection**.

You can think of it like **class inheritance in TypeScript or OOP**, but at the **database level**.

---

### ✅ Example Concept

You have a `User` base model:

```ts
User
├── Admin
├── Customer
```

- All stored in **one MongoDB collection (`users`)**.
- Each has unique fields, but shares base fields like `name`, `email`, `role`.

---

## 🧩 12.2 Why Use Discriminators?

| Benefit                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| ✅ Shared structure    | Base fields (e.g. `name`, `email`) across all roles |
| ✅ Polymorphic queries | Query all types in one collection                   |
| ✅ Cleaner design      | Role-specific logic separated in models             |
| ✅ Less duplication    | Avoid repeating schema definitions                  |
| ✅ Consistent indexes  | Shared fields are indexed once                      |

---

## ⚙️ 12.3 Create a Base Schema (Parent)

Let’s build a real example.

```ts
import { Schema, model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const options = { discriminatorKey: "role", timestamps: true };

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  options
);

export const User = model<IUser>("User", userSchema);
```

🧠 **Explanation:**

- `discriminatorKey: "role"` tells Mongoose which field will identify the model type.
- Every sub-model will automatically get this `role` field.

---

## 🧩 12.4 Create Sub-Schemas (Children)

Now we’ll create specialized models for `Admin` and `Customer`.

---

### 🧱 Admin Schema

```ts
export interface IAdmin extends IUser {
  permissions: string[];
}

const adminSchema = new Schema<IAdmin>({
  permissions: [{ type: String, enum: ["manage_users", "view_reports", "edit_content"] }],
});

export const Admin = User.discriminator<IAdmin>("Admin", adminSchema);
```

✅ This will store Admin documents with `role: "Admin"` automatically.

---

### 🧾 Customer Schema

```ts
export interface ICustomer extends IUser {
  loyaltyPoints: number;
  address: string;
}

const customerSchema = new Schema<ICustomer>({
  loyaltyPoints: { type: Number, default: 0 },
  address: { type: String },
});

export const Customer = User.discriminator<ICustomer>("Customer", customerSchema);
```

✅ Customer docs have unique fields, but still live in the same `users` collection.

---

## 🧠 12.5 How Data Looks in the Collection

After inserting:

```ts
await Admin.create({
  name: "Vipin Singh",
  email: "vipin@admin.com",
  permissions: ["manage_users"],
});

await Customer.create({
  name: "Aman Kumar",
  email: "aman@customer.com",
  loyaltyPoints: 120,
  address: "Delhi",
});
```

MongoDB `users` collection:

```json
[
  {
    "_id": "66f...",
    "name": "Vipin Singh",
    "email": "vipin@admin.com",
    "permissions": ["manage_users"],
    "role": "Admin",
    "createdAt": "2025-10-04"
  },
  {
    "_id": "66f...",
    "name": "Aman Kumar",
    "email": "aman@customer.com",
    "loyaltyPoints": 120,
    "address": "Delhi",
    "role": "Customer",
    "createdAt": "2025-10-04"
  }
]
```

✅ Both stored in **one collection**, differentiated by `role`.

---

## ⚙️ 12.6 Querying with Discriminators

You can query **by base model** or **specific discriminators**:

### Query all users (base model):

```ts
const users = await User.find();
```

### Query only Admins:

```ts
const admins = await Admin.find();
```

### Query only Customers:

```ts
const customers = await Customer.find({ loyaltyPoints: { $gte: 50 } });
```

### Query by role manually:

```ts
const admins = await User.find({ role: "Admin" });
```

✅ Mongoose automatically filters by the discriminator type.

---

## 🧩 12.7 TypeScript Benefit

Because discriminators return _typed sub-models_, TypeScript knows their shape:

```ts
const admin = await Admin.create({
  name: "Vipin",
  email: "v@x.com",
  permissions: ["view_reports"],
});
admin.permissions; // ✅ Typed: string[]
admin.loyaltyPoints; // ❌ Error: Not part of Admin type
```

✅ Ensures strict type safety across your models.

---

## ⚡ 12.8 Real-World Example: Role-Based Access

You can implement role-specific behaviors:

```ts
userSchema.methods.getDashboardData = function () {
  if (this.role === "Admin") return "Admin metrics";
  if (this.role === "Customer") return "Your recent orders";
};
```

Or use discriminators to store multiple user types with unique logic.

---

## 🧠 12.9 Model Methods & Middleware Work Across Discriminators

Hooks and methods on the base schema automatically apply to all discriminators.

Example:

```ts
userSchema.pre("save", function (next) {
  console.log(`[${this.role}] Saving user: ${this.email}`);
  next();
});
```

Will log messages for both Admin and Customer documents.

---

## 🧮 12.10 Alternative: Separate Collections (When to Avoid Discriminators)

Discriminators are great for shared collections, but sometimes **separate collections** are better.

| Use Discriminators                | Use Separate Collections     |
| --------------------------------- | ---------------------------- |
| Few types (e.g., Admin, Customer) | Many unrelated types         |
| Common fields (email, name, etc.) | Different schema structures  |
| Shared queries (User.find())      | Independent queries per type |
| Need to query all roles together  | Roles rarely overlap         |

---

## ⚙️ 12.11 Inheritance Visualization

```
                   ┌───────────────┐
                   │   User Base   │
                   │ name, email   │
                   │ role: String  │
                   └──────┬────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
 ┌──────────────┐                   ┌──────────────┐
 │   Admin      │                   │  Customer    │
 │ permissions  │                   │ loyaltyPoints│
 └──────────────┘                   └──────────────┘
```

All stored in one collection:
📂 `users`

---

## ⚡ 12.12 Real Use Case Example

**Example: Education System**

- `User` → base schema
- `Student` → child with fields `grade`, `subjects`
- `Teacher` → child with `department`, `salary`

All stored in the `users` collection — easily queryable by role.

---

## 🧠 12.13 Summary

| Concept               | Description                                         |
| --------------------- | --------------------------------------------------- |
| **Discriminator**     | Mongoose feature for schema inheritance             |
| **Base Schema**       | Shared fields for all types                         |
| **Child Schema**      | Adds role-specific fields                           |
| **discriminatorKey**  | Field (e.g. `role`) used to identify the model type |
| **Shared Collection** | All stored together                                 |
| **Use Case**          | Roles, polymorphic entities, type variations        |

---

## 🚀 Coming Next: **Point 13 – Connection Management**

You’ll learn:

- How to handle MongoDB connection pooling efficiently
- Managing multiple databases in the same app
- Graceful shutdown strategies
- Handling reconnects in production
- Avoiding memory leaks with async connections

---
