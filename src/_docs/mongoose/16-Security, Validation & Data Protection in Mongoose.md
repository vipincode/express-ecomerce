## 🧠 15.1 Why Security Matters in Mongoose

Even though MongoDB is schema-flexible, it’s not security-flexible.
Poor query handling or schema design can lead to:
❌ Leaked data
❌ Unauthorized access
❌ Corrupted documents
❌ NoSQL injection attacks

Your schema, queries, and API validation layer must work together to protect your data.

---

## ⚙️ 15.2 Common Security Risks in Mongoose Apps

| Threat                  | Example                              | Risk                         |
| ----------------------- | ------------------------------------ | ---------------------------- |
| **NoSQL Injection**     | Passing `{"$gt": ""}` as a filter    | Bypass authentication        |
| **Overexposed Fields**  | Returning passwords or tokens        | Data leak                    |
| **Unvalidated Input**   | Accepting user input as is           | Data corruption or injection |
| **Lack of Encryption**  | Storing plaintext passwords          | Sensitive data exposure      |
| **Weak Query Handling** | Directly using `req.body` in queries | Malicious query manipulation |

---

## 🧩 15.3 Preventing NoSQL Injection

### ❌ Vulnerable Code

```ts
// ⚠️ Dangerous
const user = await User.findOne({ email: req.body.email, password: req.body.password });
```

If an attacker sends:

```json
{
  "email": { "$ne": null },
  "password": { "$ne": null }
}
```

→ MongoDB interprets that as **“find any user”**
✅ Result: attacker logs in as _someone else_.

---

### ✅ Secure Fix: Explicit Validation

Use libraries like **Zod** or **express-validator** to validate input before queries.

```ts
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const parsed = loginSchema.parse(req.body);

const user = await User.findOne({ email: parsed.email });
```

✅ Only strings pass
✅ No `$ne`, `$gt`, `$regex`, or other operator injections possible

---

### ✅ Alternative: Use `mongoose-sanitize` Middleware

Install:

```bash
npm install express-mongo-sanitize
```

Usage in Express:

```ts
import mongoSanitize from "express-mongo-sanitize";

app.use(mongoSanitize());
```

This automatically removes `$` and `.` keys from incoming objects to block malicious operators.

---

## 🧠 15.4 Prevent Overexposed Fields

Never return sensitive fields such as:

- Passwords
- Tokens
- Internal IDs
- Access logs

---

### ✅ Use `select: false` in your schema

```ts
const userSchema = new Schema({
  name: String,
  email: String,
  password: { type: String, required: true, select: false },
});
```

Now:

```ts
await User.find(); // Password not returned
await User.find().select("+password"); // Explicitly include if needed
```

✅ Protects against accidental leaks

---

### ✅ Hide Fields in JSON Responses

```ts
userSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});
```

✅ Useful for API responses and serialization

---

## ⚙️ 15.5 Field-Level Encryption (FLE)

MongoDB supports **Client-Side Field-Level Encryption (CSFLE)** — fields are encrypted before being sent to MongoDB.

With Mongoose, you can also implement encryption using libraries like `mongoose-encryption`.

---

### Example:

```ts
import encrypt from "mongoose-encryption";

const secret = process.env.ENCRYPTION_KEY!;

userSchema.plugin(encrypt, {
  secret,
  encryptedFields: ["ssn", "creditCardNumber"],
});
```

✅ Data encrypted at rest and in transit
✅ Only decryptable by your app, not the DB admin

---

## 🧩 15.6 Hashing Passwords Securely

Never store raw passwords. Use `bcrypt`.

```ts
import bcrypt from "bcryptjs";

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (entered: string) {
  return bcrypt.compare(entered, this.password);
};
```

✅ One-way encryption
✅ Prevents stolen database dumps from exposing passwords

---

## ⚡ 15.7 Secure Querying Patterns

| ✅ Safe                                       | ❌ Unsafe                      |
| --------------------------------------------- | ------------------------------ |
| `User.findOne({ email: safeInput })`          | `User.findOne(req.body)`       |
| `User.updateOne({ _id }, { $set: safeData })` | `User.updateOne({}, req.body)` |
| Parameterized queries                         | Dynamic user-supplied objects  |
| Validate + sanitize first                     | Use body directly in DB calls  |

Always sanitize and validate before passing any user data to a query.

---

## 🧠 15.8 Schema-Level Validation & Sanitization

Mongoose’s built-in validation helps protect your data at the schema layer.

```ts
const productSchema = new Schema({
  name: {
    type: String,
    required: [true, "Product name required"],
    trim: true,
    maxlength: 100,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});
```

✅ Prevents invalid or malicious data from being stored
✅ Complements external validation

---

## 🧩 15.9 Rate Limiting and Brute-Force Protection

Attackers can brute-force login routes.
Use rate-limiting middleware like `express-rate-limit`.

```ts
import rateLimit from "express-rate-limit";

app.use(
  "/api/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, try again later.",
  })
);
```

✅ Protects authentication endpoints

---

## ⚙️ 15.10 Secure API Pagination (Avoid Data Enumeration)

Always paginate API results:

```ts
const users = await User.find().select("name email").limit(20).skip(20);
```

✅ Prevents users from downloading full datasets.

---

## ⚡ 15.11 Schema Access Control (Role-Based Projection)

You can dynamically hide fields based on user roles.

```ts
userSchema.methods.toRoleSafeJSON = function (role: string) {
  const obj = this.toObject();
  if (role !== "admin") delete obj.email;
  delete obj.password;
  return obj;
};
```

✅ Prevents overexposure based on privileges

---

## 🧩 15.12 Auditing & Logging

Track who changes what — useful for both debugging and compliance.

```ts
userSchema.pre("updateOne", function (next) {
  console.log(`User updated at ${new Date().toISOString()}`);
  next();
});
```

✅ Log changes for sensitive collections (orders, users, payments)

---

## 🧠 15.13 MongoDB Role-Based Access Control (RBAC)

At the database level, MongoDB supports RBAC roles:

- **read**
- **readWrite**
- **dbAdmin**
- **clusterAdmin**

For production, create users with **least privilege**:

```bash
db.createUser({
  user: "appUser",
  pwd: "securePass",
  roles: [{ role: "readWrite", db: "appDB" }]
});
```

✅ Prevents your app from dropping collections or creating new databases by mistake

---

## ⚙️ 15.14 Common Security Settings for Production

| Setting                   | Description                    |
| ------------------------- | ------------------------------ |
| `autoIndex: false`        | Prevents index build overhead  |
| `ssl: true`               | Always connect over TLS        |
| `authSource: admin`       | Secure authentication database |
| `readPreference: primary` | Avoid inconsistent reads       |
| Environment variables     | Never store secrets in code    |

---

## 🧠 15.15 Summary

| Concept                | Description                                 |
| ---------------------- | ------------------------------------------- |
| NoSQL Injection        | Blocked via input validation & sanitization |
| Field Protection       | Use `select: false`, `toJSON` transforms    |
| Password Security      | Always hash before save                     |
| Field Encryption       | Use `mongoose-encryption` or CSFLE          |
| Schema Validation      | Prevent invalid or malicious data           |
| Rate Limiting          | Stop brute-force attacks                    |
| RBAC                   | Use least-privileged MongoDB users          |
| Graceful Data Exposure | Role-based response shaping                 |

---

## 🚀 Coming Next: **Point 16 – Testing & Debugging Mongoose Apps**

We’ll cover:

- Unit & integration testing with Jest
- Using `mongodb-memory-server` for in-memory DB tests
- Mocking Mongoose models
- Debugging queries with `mongoose.set("debug", true)`
- Measuring performance with explain plans in tests

---
