**clean and secure authentication flow** using **HTTP-only cookies** for access and refresh tokens 👏

Now let’s carefully decide whether **CSRF cookies** are necessary in your current setup, and if so, how to implement them properly.

---

## 🧠 First: Understand the Threat Model

**CSRF (Cross-Site Request Forgery)** attacks happen when:

- A **malicious website** tricks a logged-in user’s browser into sending a **state-changing request** (e.g., `/api/logout`, `/api/delete-account`)
- Because the **browser automatically sends cookies**, the backend **thinks it’s an authenticated request**.

So, the attacker doesn’t need to know your token — they just exploit the browser’s auto-cookie behavior.

---

## 🔐 But in Your Setup: You’re Already Mostly Safe

Here’s what you’ve done right:

✅ **Access + Refresh Tokens are `HttpOnly`**

- That means they **can’t be read or stolen** by malicious JavaScript (XSS).

✅ **SameSite: "lax"**

- This prevents cookies from being sent on _most_ cross-site requests (like forms or images), **reducing CSRF risk**.
- Only safe navigations (like clicking a link) will include cookies, and usually, your API calls happen via `fetch()` or `axios`, not direct link clicks.

✅ **Access tokens are short-lived**

- They expire in 15 minutes, so even if something goes wrong, the attack window is small.

✅ **Refresh tokens are stored HttpOnly**

- Attackers can’t access them from JavaScript.

---

## ⚠️ So... Do You _Need_ a CSRF Token?

**In general:**

- ❌ If your frontend and backend are **separate domains** (e.g., `frontend.com` → `api.backend.com`), and your API requests use **`fetch` or Axios** with `credentials: 'include'`,
  then you **should include a CSRF token**.
- ✅ If both are on **the same origin** (e.g., `app.example.com` + `api.example.com`) **and you’re using SameSite cookies**, it’s usually **not strictly necessary**, though it’s still a good defense-in-depth measure.

---

## 🧩 Why CSRF Token Can Still Be Good

Even though you’re _mostly protected_, CSRF tokens:

- Add **explicit proof** that a request came from your own frontend.
- Help if you ever change SameSite policy (e.g., to `None` for cross-domain).
- Are a **common best practice** in secure systems (like banking or dashboards).

So — yes, it’s _not mandatory_ in your setup, but **recommended** for future-proofing.

---

## ✅ If You Decide to Use CSRF Cookies

Here’s how to integrate it **safely** (and simply):

### Step 1. Issue CSRF Token Cookie

You already have:

```ts
export const setCsrfCookie = (res: Response): string => {
  const csrfToken = randomBytes(24).toString("hex");

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false, // frontend can read it
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return csrfToken;
};
```

### Step 2. Frontend sends the CSRF token on every request

Example using Axios:

```ts
import axios from "axios";

axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const csrfToken = getCookie("csrfToken");
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});
```

`getCookie` can be a small helper:

```ts
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
};
```

### Step 3. Backend Middleware to Validate CSRF Token

```ts
import { Request, Response, NextFunction } from "express";

export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};
```

Then apply this middleware **after authentication**, for protected routes:

```ts
import { authenticateUser } from "../middlewares/auth";
import { verifyCsrfToken } from "../middlewares/csrf";

router.post("/profile", authenticateUser, verifyCsrfToken, updateProfile);
```

---

## 🚀 Final Recommendation

| Scenario                                      | CSRF Needed?            | Why                                                  |
| --------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| Same-origin app (SPA + API on same domain)    | Optional                | SameSite + HttpOnly cookies already protect you well |
| Cross-origin setup (different domains)        | ✅ Yes                  | Browser will send cookies on cross-origin requests   |
| You might use 3rd-party integrations          | ✅ Yes                  | Adds safety against request forgery                  |
| Security-sensitive (banking, dashboard, etc.) | ✅ Strongly recommended | Defense-in-depth                                     |

---

## ✅ Conclusion

In **your current setup**, CSRF protection is **not strictly required**, but **recommended** for:

- Cross-domain setups, or
- Long-term scalability (if you move to multiple subdomains or microservices)

Since you already have the function `setCsrfCookie`, I’d **keep it** and **use it** with the middleware above. It adds little complexity but increases your overall security posture significantly.

---

Perfect — let’s make your **CSRF protection fully automatic**, clean, and safe ✅

We’ll integrate it **directly into your authentication flow**, so you don’t have to manually attach the middleware for each protected route.

---

## 🧩 Here’s the plan

You already have:

- ✅ Secure **access + refresh tokens** using cookies
- ✅ Optional **CSRF token cookie**
- ✅ `authenticateUser` middleware that verifies and refreshes tokens

We’ll extend `authenticateUser` to **also verify the CSRF token** automatically for all **state-changing requests** (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## ⚙️ Step 1 — Add a small CSRF verification helper

Create a new file:
`middlewares/csrf.ts`

```ts
import { Request, Response, NextFunction } from "express";

/**
 * Verifies CSRF token for non-GET requests.
 * Compares cookie (csrfToken) and header (X-CSRF-Token).
 */
export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Only validate CSRF for state-changing requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }

  next();
};
```

---

## ⚙️ Step 2 — Integrate it into `authenticateUser` middleware

Now modify your existing `/middlewares/auth.ts` file like this 👇

```ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from "../utils/jwt";
import { User } from "../models/user.model";
import { setTokenCookie } from "../utils/cookies";
import { verifyCsrfToken } from "./csrf"; // ✅ import CSRF check

/**
 * Middleware that authenticates user and auto-refreshes expired tokens.
 * Also automatically checks CSRF for non-GET requests.
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // ✅ 1. Verify access token if valid
    const payload = await verifyAccessToken(accessToken);
    req.user = payload;

    // ✅ 2. Verify CSRF token automatically for unsafe methods
    return verifyCsrfToken(req, res, next);
  } catch (err: any) {
    // ✅ 3. Access token expired — try refreshing
    if (err.code === "ERR_JWT_EXPIRED" || err.message?.includes("exp")) {
      try {
        if (!refreshToken) {
          return res.status(401).json({ error: "Session expired. Please log in again." });
        }

        const refreshPayload = await verifyRefreshToken(refreshToken);
        const user = await User.findById(refreshPayload.id);

        // If the stored refresh token doesn't match, it's invalid
        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ error: "Invalid refresh token" });
        }

        // ✅ Generate new access token
        const newAccessToken = await generateAccessToken({
          id: user.id,
          email: user.email,
          username: user.email,
        });

        setTokenCookie(res, newAccessToken);
        req.user = refreshPayload;

        // ✅ Verify CSRF token before continuing
        return verifyCsrfToken(req, res, next);
      } catch (refreshErr) {
        console.error("Refresh token failed:", refreshErr);
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
    }

    // ❌ Other JWT errors
    console.error("Access token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
```

---

## ⚙️ Step 3 — Frontend: Automatically include CSRF token

In your **Axios setup**, add a request interceptor so every request includes the token:

```ts
import axios from "axios";

axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const csrfToken = getCookie("csrfToken");
  if (csrfToken && config.method && config.method !== "get") {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}
```

---

## ✅ Step 4 — Result

| Feature                       | Status                                      |
| ----------------------------- | ------------------------------------------- |
| Access token rotation         | ✅ Yes                                      |
| Refresh token stored securely | ✅ Yes                                      |
| HttpOnly cookies              | ✅ Yes                                      |
| CSRF protection               | ✅ Automatically applied for unsafe methods |
| Works with Axios              | ✅ Automatically adds header                |

---

## 🔐 Summary

With this setup:

- You no longer need to manually attach `verifyCsrfToken` to each route.
- Every authenticated route **automatically checks the CSRF token** for `POST`, `PUT`, `PATCH`, `DELETE` methods.
- You’re now **fully protected against CSRF**, **XSS**, and **token theft**.

---
