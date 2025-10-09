# 📗 Chapter 4: Data Relationships & Population

---

## 🧩 4.1 Why Relationships Matter

MongoDB is **NoSQL**, so it doesn’t have joins like SQL databases.
But Mongoose adds a layer on top — allowing **document linking** via `ObjectId` references, and even “joins” through `.populate()`.

There are **two main strategies** for relationships:

| Strategy        | Description                                       | Example Use      |
| --------------- | ------------------------------------------------- | ---------------- |
| **Embedding**   | Store related data inside the same document       | User → Addresses |
| **Referencing** | Store only IDs, and fetch related data separately | User → Posts     |

---

## ⚙️ 4.2 Embedding vs Referencing

### 🔹 Embedding (Denormalization)

You store related data _inside_ the document.

```ts
const userSchema = new Schema({
  name: String,
  addresses: [
    {
      street: String,
      city: String,
      country: String,
    },
  ],
});
```

✅ Pros:

- Fast read (single query)
- Simpler to manage small subdocs

❌ Cons:

- Harder to update nested arrays
- Document size limit (16MB)
- Redundant data if reused elsewhere

---

### 🔹 Referencing (Normalization)

You reference another document using its `_id`.

```ts
const postSchema = new Schema({
  title: String,
  content: String,
  author: { type: Schema.Types.ObjectId, ref: "User" },
});
```

✅ Pros:

- Better for large or reusable data
- Cleaner separation between models

❌ Cons:

- Requires extra query (`populate()`)
- Slightly slower than embedded reads

---

## 🧠 4.3 Creating Relationships (Referencing)

Example with `User` and `Post` models:

```ts
// user.model.ts
import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

export const User = model<IUser>("User", userSchema);
```

```ts
// post.model.ts
import { Schema, model, Document } from "mongoose";

export interface IPost extends Document {
  title: string;
  body: string;
  author: Schema.Types.ObjectId;
}

const postSchema = new Schema<IPost>({
  title: { type: String, required: true },
  body: { type: String },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

export const Post = model<IPost>("Post", postSchema);
```

Now `Post` references `User` through `author`.

---

## 🔍 4.4 Using `.populate()` to Join Data

You can **populate** referenced fields (like SQL joins):

```ts
const posts = await Post.find().populate("author");
```

Mongoose automatically replaces the `author` ObjectId with the full `User` document.

Output:

```json
[
  {
    "title": "Intro to MongoDB",
    "author": {
      "_id": "66f0...",
      "name": "Vipin",
      "email": "vipin@mail.com"
    }
  }
]
```

---

### Populate Specific Fields

You can limit which fields to populate:

```ts
await Post.find().populate("author", "name email -_id");
```

---

### Populate Nested References

You can populate references inside populated docs:

```ts
Post.find().populate({
  path: "author",
  populate: { path: "profile", select: "bio location" },
});
```

---

## ⚙️ 4.5 Virtual Populate (Reverse Relationship)

Sometimes you need the reverse link:
“Find all posts that belong to this user.”

Instead of storing post IDs in User, use **virtual populate**:

```ts
// user.model.ts
userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
});
```

Then:

```ts
const user = await User.findOne({ name: "Vipin" }).populate("posts");
console.log(user.posts);
```

✅ No duplicate data
✅ Works even if posts were added later

---

## 🧮 4.6 Population Options

```ts
Post.find().populate({
  path: "author",
  select: "name email",
  match: { isActive: true },
  options: { limit: 5, sort: { name: 1 } },
});
```

| Option     | Description                  |
| ---------- | ---------------------------- |
| `path`     | Field to populate            |
| `select`   | Fields to include/exclude    |
| `match`    | Add filter to populated docs |
| `options`  | Limit, skip, sort            |
| `populate` | Nested population            |

---

## ⚡ 4.7 Populating Multiple Fields

If your schema has multiple references:

```ts
const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  product: { type: Schema.Types.ObjectId, ref: "Product" },
});
```

You can populate both:

```ts
await Order.find().populate("user", "name").populate("product", "title price");
```

---

## 🧩 4.8 Lean Population for Performance

When you call `.populate()`, Mongoose returns **full Mongoose documents** — which adds overhead.

If you only need plain JSON data:

```ts
await Post.find().populate("author").lean();
```

✅ Much faster
✅ Lower memory usage
⚠️ No Mongoose getters/setters available in lean mode

---

## 🧮 4.9 Virtual vs Real Population Comparison

| Feature     | Real `ref` populate       | Virtual populate              |
| ----------- | ------------------------- | ----------------------------- |
| Data stored | ObjectId in DB            | No actual field stored        |
| Use case    | One-to-one or many-to-one | Reverse lookups (one-to-many) |
| Pros        | Simpler to query directly | Prevents redundancy           |
| Cons        | Requires manual linking   | Slightly slower populate      |

---

## ⚙️ 4.10 Aggregation `$lookup` (Advanced Join)

When `.populate()` is not enough (e.g., filtering large joined data), use **MongoDB aggregation**:

```ts
await Post.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "author",
      foreignField: "_id",
      as: "authorDetails",
    },
  },
  { $unwind: "$authorDetails" },
  { $project: { title: 1, "authorDetails.name": 1 } },
]);
```

✅ Faster for large data sets
✅ Allows complex joins, filters, projections

---

## 🧠 4.11 Production Performance Tips

| ✅ Do                              | ❌ Avoid                         |
| ---------------------------------- | -------------------------------- |
| Use `lean()` when possible         | Overpopulating large nested data |
| Use `select` to limit fields       | Returning entire subdocuments    |
| Use indexes on reference fields    | Forgetting to index `_id` or ref |
| Use `virtual populate` for reverse | Storing redundant relationships  |
| Prefer aggregation for analytics   | Populating thousands of docs     |

---

## ⚙️ 4.12 Example: Real-World Blog Model

```ts
// user.model.ts
const userSchema = new Schema({
  name: String,
  email: String,
});
userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
});
export const User = model("User", userSchema);

// post.model.ts
const postSchema = new Schema({
  title: String,
  content: String,
  author: { type: Schema.Types.ObjectId, ref: "User" },
});
export const Post = model("Post", postSchema);

// usage
const vipin = await User.findOne({ name: "Vipin" }).populate("posts");
console.log(vipin.posts);
```

---

## 🧠 Summary

| Concept               | Description                                     |
| --------------------- | ----------------------------------------------- |
| Embedding             | Store related data inside parent document       |
| Referencing           | Use ObjectId references to link documents       |
| Populate              | Retrieves referenced documents (like SQL joins) |
| Virtual Populate      | Reverse linking without storing IDs             |
| Lean                  | Returns plain JSON for performance              |
| Aggregation `$lookup` | Native MongoDB join for large datasets          |

---

## 🚀 Coming Next: **Point 5 – Virtuals, Getters & Setters**

You’ll learn:

- How **virtuals** create computed fields (like `fullName`)
- How **getters/setters** transform data automatically
- How to control JSON output with `toJSON` and `toObject`
- Real-world examples: formatting prices, hiding sensitive data, etc.

---
