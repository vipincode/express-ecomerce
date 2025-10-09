> ❓ “If I delete a user, how do I also delete all documents related to that user (like profile, addresses, orders, etc.)?”

MongoDB **does not have automatic cascading deletes** like SQL (foreign keys + `ON DELETE CASCADE`).
So you must handle this **manually**, either:

1. 🧠 Using **Mongoose Middleware** (`pre('findOneAndDelete')`, `post('deleteOne')`, etc.)
2. ⚙️ Or inside your **Controller logic** (explicit deletion)

We’ll go with the **cleanest and safest approach** — **Mongoose middleware** — so it’s **automatic** and **centralized**.

---

## 🧱 Example Scenario

We have these schemas:

- `User`
- `Profile` (1:1 → user)
- `Address` (1:N → user)

When a **User** is deleted, we want:

- `Profile` (related to user) → deleted
- `Addresses` (related to user) → deleted

---

### 🧠 Relationship Setup

#### ✅ `User` model

```ts
import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
```

---

#### ✅ `Profile` model

```ts
import { Schema, model, Document, Types } from "mongoose";

export interface IProfile extends Document {
  user: Types.ObjectId;
  firstName: string;
  lastName: string;
}

const profileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: String,
    lastName: String,
  },
  { timestamps: true }
);

export const Profile = model<IProfile>("Profile", profileSchema);
```

---

#### ✅ `Address` model

```ts
import { Schema, model, Document, Types } from "mongoose";

export interface IAddress extends Document {
  user: Types.ObjectId;
  city: string;
  country: string;
}

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    city: String,
    country: String,
  },
  { timestamps: true }
);

export const Address = model<IAddress>("Address", addressSchema);
```

---

## ⚙️ Step 1: Implement Cascade Delete in `User` Model

We’ll use **pre middleware** on `findOneAndDelete` and `deleteOne`.

> 💡 Why `findOneAndDelete`?
> Because your controller will likely call `User.findByIdAndDelete()` or `User.findOneAndDelete()`.

Add this in `user.model.ts` (below schema):

```ts
import { Profile } from "./profile.model";
import { Address } from "./address.model";

userSchema.pre("findOneAndDelete", async function (next) {
  const query = this.getFilter(); // get user filter (e.g., { _id: "123" })
  const userId = query._id;

  if (!userId) return next();

  console.log("Cascade deleting data for user:", userId);

  await Promise.all([Profile.deleteOne({ user: userId }), Address.deleteMany({ user: userId })]);

  next();
});
```

✅ This middleware triggers **automatically** when you call:

```ts
await User.findByIdAndDelete(userId);
```

And deletes:

- `Profile` where `user = userId`
- `Address` documents where `user = userId`

---

### 🧠 How It Works:

- Mongoose calls the middleware **before** deleting user.
- You grab `userId` from query filter (`this.getFilter()`).
- Delete related docs from other collections.
- Proceed with user deletion (`next()`).

---

## ⚙️ Step 2: Delete User in Controller

In your controller, just delete the user normally:

```ts
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User and related data deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
```

✅ No need to delete profile/address manually — the middleware handles it.

---

## 🧪 Example Flow

### 1️⃣ Create user + profile + addresses

```js
POST /api/users
{
  "email": "vipin@example.com",
  "password": "123456"
}
```

→ Create `Profile` and `Address` linked with `user._id`

---

### 2️⃣ Delete user

```http
DELETE /api/users/671abc123456
```

🧠 Mongoose Middleware runs:

```bash
Deleting Profile(user=671abc123456)
Deleting Addresses(user=671abc123456)
```

✅ Then user is deleted.

---

## 🧩 Notes

### ✅ You can use other hooks too

- `pre('deleteOne', { document: true, query: false })` if you call `user.deleteOne()` directly
- `pre('findByIdAndDelete')` (alias of `findOneAndDelete`)

But **query middleware** is most flexible.

---

### ✅ For multiple child relations

You can delete multiple collections in parallel:

```ts
await Promise.all([
  Profile.deleteOne({ user: userId }),
  Address.deleteMany({ user: userId }),
  Order.deleteMany({ user: userId }),
  Cart.deleteOne({ user: userId }),
]);
```

---

### ✅ If using **transactions**

You can also wrap in **session** to ensure atomicity:

```ts
const session = await mongoose.startSession();
session.startTransaction();

await Profile.deleteOne({ user: userId }, { session });
await Address.deleteMany({ user: userId }, { session });
await User.deleteOne({ _id: userId }, { session });

await session.commitTransaction();
session.endSession();
```

---

✅ **Best Practice Summary:**

| Option                                    | How                        | Pros                  | Cons                            |
| ----------------------------------------- | -------------------------- | --------------------- | ------------------------------- |
| 🔹 Middleware (`pre('findOneAndDelete')`) | Automatic                  | Centralized, reusable | Only triggers if used correctly |
| 🔹 Controller                             | Manual delete related data | Explicit control      | Duplicated logic                |
| 🔹 Transactions                           | Delete all in one go       | Atomic                | Slightly more complex           |

---

✅ **Recommended Pattern (Production):**

- Use `pre('findOneAndDelete')` middleware for cascading deletions
- Use `Promise.all()` for parallel deletion
- Optionally wrap in a **transaction** for atomic operations

---
