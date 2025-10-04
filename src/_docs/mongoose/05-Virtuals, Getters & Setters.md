Excellent ⚡ — let’s move to **Point 5: Virtuals, Getters & Setters**, one of the most _elegant and powerful_ parts of Mongoose that help you **transform**, **compute**, and **control how your data looks** — without changing what’s stored in MongoDB.

This feature is especially important for **clean APIs**, **data presentation**, and **security** (e.g., hiding private fields like passwords).

---

# 📘 Chapter 5: Virtuals, Getters & Setters

---

## 🧩 5.1 What Are Virtuals?

A **Virtual** is a property that **doesn’t exist in MongoDB**, but is **computed dynamically** from existing fields when you access or return a document.

Think of it as a _calculated field_ — like a formula column in Excel.

### 🧠 Example:

```ts
const userSchema = new Schema({
  firstName: String,
  lastName: String,
});

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
```

Usage:

```ts
const user = await User.findOne();
console.log(user.fullName); // "Vipin Singh"
```

✅ `fullName` is **not stored** in MongoDB — it’s generated at runtime.

---

## ⚙️ 5.2 Creating Virtual Fields

Virtuals are defined **before model creation** and can have:

- A **getter** (for reading)
- A **setter** (for writing)

Example:

```ts
userSchema
  .virtual("fullName")
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function (value: string) {
    const [first, last] = value.split(" ");
    this.firstName = first;
    this.lastName = last;
  });
```

Now:

```ts
user.fullName = "Vipin Singh"; // sets both firstName and lastName
console.log(user.firstName); // "Vipin"
console.log(user.lastName); // "Singh"
```

---

## 🔍 5.3 Enable Virtuals in JSON Output

By default, virtuals **don’t appear** in JSON or `toObject()` results.

Enable them:

```ts
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });
```

Now when you send data in an API response:

```ts
res.json(user);
```

→ Virtuals (like `fullName`) appear automatically.

---

## 🧠 5.4 Real-World Example: Product with Price

```ts
const productSchema = new Schema({
  name: String,
  price: Number, // price in cents
});

productSchema.virtual("priceInRupees").get(function () {
  return this.price / 100;
});

productSchema.set("toJSON", { virtuals: true });
```

Output:

```json
{
  "name": "Laptop",
  "price": 950000,
  "priceInRupees": 9500
}
```

✅ Perfect for formatting currency, computed fields, etc.

---

## ⚡ 5.5 Getters and Setters (Field Transformers)

**Getters and setters** are similar to virtuals but work on **real fields** — they transform data **when reading or writing**.

---

### 🔹 Getter (runs when reading)

```ts
const userSchema = new Schema({
  name: {
    type: String,
    get: (v: string) => v.toUpperCase(),
  },
});
```

Now:

```ts
const user = await User.create({ name: "vipin" });
console.log(user.name); // "VIPIN"
```

---

### 🔹 Setter (runs when writing)

```ts
const productSchema = new Schema({
  price: {
    type: Number,
    set: (v: number) => Math.round(v), // round price to nearest integer
  },
});
```

Now:

```ts
const item = await Product.create({ price: 199.75 });
console.log(item.price); // 200
```

---

## 🧮 5.6 Combining Virtuals, Getters & Setters

```ts
const userSchema = new Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      set: (v: string) => v.toLowerCase(), // normalize
      get: (v: string) => v.replace(/(.{2}).+(@.+)/, "$1***$2"), // hide part
    },
  },
  { toJSON: { virtuals: true, getters: true } }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
```

Output:

```json
{
  "firstName": "Vipin",
  "lastName": "Singh",
  "email": "vi***@gmail.com",
  "fullName": "Vipin Singh"
}
```

✅ Secure
✅ Clean
✅ API-friendly

---

## ⚙️ 5.7 Virtual Populate (Review)

Remember virtual populate from last chapter? It’s actually a **type of virtual** that establishes a _reverse relationship_.

Example:

```ts
userSchema.virtual("posts", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
});
```

This creates a _virtual relationship_ — no `posts` array in DB, but accessible via `.populate("posts")`.

---

## 🔒 5.8 Hiding Sensitive Fields

Mongoose allows you to transform documents before sending them as JSON.

Example:

```ts
userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});
```

Output will automatically exclude private fields.

✅ Production best practice — always hide `password`, `tokens`, etc.

---

## 🧠 5.9 Schema Transformations Summary

| Feature                       | Triggered When     | Affects     | Stored in DB? | Typical Use                                |
| ----------------------------- | ------------------ | ----------- | ------------- | ------------------------------------------ |
| **Virtual**                   | Access or populate | Output only | ❌ No         | Derived fields (e.g., full name)           |
| **Getter**                    | Reading from DB    | Field value | ✅ Yes        | Formatting data (e.g., uppercasing)        |
| **Setter**                    | Writing to DB      | Field value | ✅ Yes        | Normalizing input (e.g., lowercase emails) |
| **toJSON/toObject transform** | Conversion         | Whole doc   | ❌ No         | Hiding sensitive data or changing shape    |

---

## ⚡ 5.10 Real-World Example: E-Commerce Product

```ts
const productSchema = new Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true }, // in cents
    discount: { type: Number, default: 0 },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("finalPrice").get(function () {
  const discounted = this.price - this.price * (this.discount / 100);
  return (discounted / 100).toFixed(2);
});

productSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.priceInRupees = ret.price / 100;
    delete ret.__v;
    return ret;
  },
});

export const Product = model("Product", productSchema);
```

Output:

```json
{
  "title": "Headphones",
  "price": 500000,
  "discount": 10,
  "finalPrice": "4500.00",
  "priceInRupees": 5000
}
```

---

## 🧠 Summary

| Concept         | Description                                               |
| --------------- | --------------------------------------------------------- |
| Virtuals        | Computed properties not stored in DB                      |
| Getters         | Transform data when reading                               |
| Setters         | Transform data when writing                               |
| toJSON/toObject | Customize document output                                 |
| Use cases       | Formatting, security, derived data, reverse relationships |

---

## 🚀 Coming Next: **Point 6 – Validation & Data Integrity**

We’ll cover:

- Built-in validators (`required`, `enum`, `min`, `max`, `match`)
- Custom and async validation functions
- Pre-save validation
- Integrating **Zod/Joi** for external validation
- Schema-level vs request-level validation
- Production validation best practices

---
