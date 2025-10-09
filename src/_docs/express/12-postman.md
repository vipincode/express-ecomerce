1. ✅ **Access protected routes** (like `/profile`)
2. ✅ **Test it correctly in Postman** (for both GET and POST)
3. ✅ **Use it safely in the frontend (React/Next.js)**

We’ll go through **backend**, **Postman**, and **frontend** step by step 👇

---

## 🧩 1. Create a protected `/profile` route

Let’s assume you have this file:
`routes/profile.routes.ts`

```ts
import express from "express";
import { authenticateUser } from "../middlewares/auth";
import { getProfile, createProfile } from "../controllers/profileController";

const router = express.Router();

// ✅ Protected routes
router.get("/", authenticateUser, getProfile);
router.post("/", authenticateUser, createProfile);

export default router;
```

Then in `server.ts` (or `app.ts`):

```ts
import profileRoutes from "./routes/profile.routes";

app.use("/api/profile", profileRoutes);
```

---

## 🧠 2. Create controller: `controllers/profileController.ts`

Example:

```ts
import { Request, Response } from "express";
import { Profile } from "../models/profile.model"; // assume you have this
import { User } from "../models/user.model";

// ✅ Get current user's profile
export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const user = await User.findById(req.user.id).populate("profile");
  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({
    profile: user.profile,
    email: user.email,
  });
};

// ✅ Create or update profile
export const createProfile = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { name, age } = req.body;

  let user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const profile = await Profile.create({ name, age, user: user._id });
  user.profile = profile._id;
  await user.save();

  res.status(201).json({ message: "Profile created", profile });
};
```

---

## 🧪 3. Testing on **Postman**

Here’s the detailed step-by-step:

### 🧾 Step 1 — Login first

Send a POST request to:

```
POST http://localhost:5000/api/auth/login
```

**Body (JSON):**

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

If login is successful, you’ll get:

```json
{ "message": "Login successful" }
```

Now open **Postman → Cookies tab**
You’ll see cookies set:

- `token` → access token
- `refreshToken` → refresh token
- `csrfToken` → for CSRF validation

✅ Those cookies are stored automatically in Postman for this domain (`localhost:5000`).

---

### 🧾 Step 2 — Access protected GET route

Now make a request:

```
GET http://localhost:5000/api/profile
```

**Headers:**

```
X-CSRF-Token: <value of csrfToken cookie>
```

**Important:**
In Postman, go to “Cookies” → copy value of `csrfToken` cookie,
and paste it in a header like this:

| Key          | Value              |
| ------------ | ------------------ |
| X-CSRF-Token | `<your csrfToken>` |

✅ Then hit **Send** —
If tokens are valid, you’ll get your profile data.

---

### 🧾 Step 3 — POST (create profile)

Request:

```
POST http://localhost:5000/api/profile
```

**Headers:**

```
Content-Type: application/json
X-CSRF-Token: <your csrfToken cookie value>
```

**Body (raw JSON):**

```json
{
  "name": "Vipin",
  "age": 25
}
```

✅ If everything is correct, you’ll get:

```json
{
  "message": "Profile created",
  "profile": {
    "name": "Vipin",
    "age": 25,
    "user": "6705e1c3f0...",
    "_id": "6705e1f7f0..."
  }
}
```

If your access token has expired, the middleware will:

- Use refresh token to issue a new access token.
- Continue the request automatically.

So Postman works just like a browser here 💪

---

## 🧭 4. How to access this data on the frontend (Next.js or React)

### ✅ Step 1 — Axios setup

Make sure your Axios instance sends cookies and CSRF token automatically:

```ts
import axios from "axios";

axios.defaults.baseURL = "http://localhost:5000/api";
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const csrf = getCookie("csrfToken");
  if (csrf && config.method && config.method !== "get") {
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

export default axios;
```

---

### ✅ Step 2 — Fetch user profile (React/Next.js example)

```tsx
"use client";
import { useEffect, useState } from "react";
import axios from "@/lib/axios"; // the above setup

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    axios
      .get("/profile")
      .then((res) => setProfile(res.data.profile))
      .catch((err) => console.error(err));
  }, []);

  if (!profile) return <p>Loading...</p>;

  return (
    <div>
      <h2>Profile</h2>
      <pre>{JSON.stringify(profile, null, 2)}</pre>
    </div>
  );
}
```

✅ Cookies are automatically sent with requests.
✅ CSRF token is auto-attached on non-GET requests.
✅ If your access token expires, the backend refreshes it silently.

---

## 🧩 Summary

| Task           | What to Do                       | Notes                         |
| -------------- | -------------------------------- | ----------------------------- |
| Login          | `POST /api/auth/login`           | Cookies automatically set     |
| GET profile    | `GET /api/profile`               | Include `X-CSRF-Token` header |
| Create profile | `POST /api/profile`              | Include `csrfToken` + cookies |
| Refresh flow   | Automatic via middleware         | No manual refresh needed      |
| Frontend       | Use Axios with `withCredentials` | Cookies + CSRF handled        |

---

✅ **Security Recap**

- JWTs in HttpOnly cookies → safe from XSS
- CSRF token → protects POST/PUT/DELETE
- Auto refresh logic → seamless for user
- Postman + browser both work out of the box

---

Perfect question 👏 — you’ve noticed that when we say
`X-CSRF-Token: <value of csrfToken cookie>`,
the cookie actually looks something like this in Postman or browser dev tools:

```
csrfToken=7e2e3ab5e8cc9b8a4e5e5c2df6b24b0b83b0c47f9f74d0b4e26c3;
Path=/;
SameSite=Lax
```

So yes — it appears as **three “values”** (or attributes).
Let’s unpack _exactly_ what’s happening and why you use only **one part** 👇

---

## 🧩 Step 1: Understand what a cookie actually looks like

A cookie is a key-value pair, plus metadata.
For example, the `Set-Cookie` header sent by your backend looks like:

```
Set-Cookie: csrfToken=7e2e3ab5e8cc9b8a4e5e5c2df6b24b0b83b0c47f9f74d0b4e26c3; Path=/; SameSite=Lax
```

Breaking this down:

| Part                                                    | Meaning                                                  |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `csrfToken`                                             | Cookie name                                              |
| `7e2e3ab5e8cc9b8a4e5e5c2df6b24b0b83b0c47f9f74d0b4e26c3` | ✅ The **token value** (this is what you send in header) |
| `Path=/`                                                | Cookie applies to all routes                             |
| `SameSite=Lax`                                          | Restricts cookie use on cross-site requests              |

---

## 🧠 Step 2: What you should send in `X-CSRF-Token` header

You only need to send **the value part**, not the full cookie string.

So in Postman or Axios:

```
X-CSRF-Token: 7e2e3ab5e8cc9b8a4e5e5c2df6b24b0b83b0c47f9f74d0b4e26c3
```

✅ That’s it.
The backend compares this value to the cookie value it set earlier.

---

## ⚙️ Step 3: How backend validates it

Your middleware:

```ts
export const verifyCsrfToken = (req, res, next) => {
  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }

  next();
};
```

So when the request arrives:

- The browser (or Postman) sends the **csrfToken cookie** automatically.
- You manually (or programmatically) send **X-CSRF-Token header**.
- The server compares them — they must **match**.

✅ If they match → request continues.
❌ If missing or mismatched → `403 Forbidden`.

---

## 🧠 Step 4: Why this works — the CSRF defense logic

The idea is:

- The attacker’s browser **can’t read cookies** (same-origin policy).
- So if an attacker tries to POST to your API, they can’t know your CSRF token.
- Your server compares the token in cookie (sent automatically) and header (sent intentionally by JS).

If both match → it’s a **legit request** from your frontend.
If not → likely **forged**.

---

## 🔍 Step 5: What you’ll see in Postman

After login:
Go to **Cookies** tab for `localhost:5000`, you’ll see something like:

| Key          | Value                       | Path | Domain    | Secure | HTTPOnly |
| ------------ | --------------------------- | ---- | --------- | ------ | -------- |
| token        | eyJhbGciOiJI...             | /    | localhost | false  | true     |
| refreshToken | eyJhbGciOiJI...             | /    | localhost | false  | true     |
| csrfToken    | 7e2e3ab5e8cc9b8a4e5e5c2d... | /    | localhost | false  | false    |

When you send a POST request:

- Postman automatically sends the `csrfToken` cookie.
- You manually add:

  ```
  X-CSRF-Token: 7e2e3ab5e8cc9b8a4e5e5c2d...
  ```

  (just the value, not Path/SameSite/etc)

---

## ⚙️ Step 6: Automating this in Postman

Instead of manually copying, you can automate it:

### 1️⃣ After login request → Tests tab:

```js
const csrfCookie = pm.cookies.get("csrfToken");
pm.environment.set("csrfToken", csrfCookie);
```

### 2️⃣ For all protected routes → Headers tab:

```
Key: X-CSRF-Token
Value: {{csrfToken}}
```

✅ Now Postman automatically injects the CSRF token value from your stored cookies.

---

## ✅ Summary

| What              | Example                       | Send?                |
| ----------------- | ----------------------------- | -------------------- |
| Cookie name       | `csrfToken`                   | Auto sent by browser |
| Cookie value      | `7e2e3ab5e8cc9b8a4e5e5c2d...` | ✅ Send in header    |
| Cookie attributes | `Path=/; SameSite=Lax`        | ❌ No need           |
| Header name       | `X-CSRF-Token`                | ✅ Required          |
| Header value      | (cookie value only)           | ✅ Must match cookie |

---

So TL;DR:

✅ **You send only the token value part** (e.g., `7e2e3a...`)
❌ **Not the entire cookie string**

That’s why it looks like “three values,” but only the middle one (the hex string) is what you actually send.

---
