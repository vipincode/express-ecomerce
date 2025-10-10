**HTTP internals → Node.js core → Express layer → your code.**

---

# 🧩 PART 1 — The Raw Foundation: Node’s `http` Module

Before Express even exists, Node.js provides a built-in module called `http`.
Everything Express does is built **on top of this.**

Example with pure Node.js:

```js
import http from "http";

const server = http.createServer((req, res) => {
  console.log(req.method); // GET / POST ...
  console.log(req.url); // /api/profile
  console.log(req.headers); // raw HTTP headers

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello from Node core!");
});

server.listen(3000);
```

✅ `req` here is an instance of **`http.IncomingMessage`**,
✅ `res` is an instance of **`http.ServerResponse`**.

They are **low-level objects** representing the actual HTTP request and response streams.

---

# 🧩 PART 2 — What Express Adds on Top

Express doesn’t replace Node’s HTTP system — it **wraps and enhances it**.

When you write:

```ts
app.get("/profile", (req, res) => { ... });
```

You’re actually working with extended versions of:

- `req: express.Request` (extends Node’s `IncomingMessage`)
- `res: express.Response` (extends Node’s `ServerResponse`)

Express adds **convenience properties and methods**
so you don’t have to manually parse headers, URLs, or bodies.

---

# 🧱 PART 3 — Inside the `req` Object (Incoming Request)

`req` (short for “request”) represents **everything the client sent**:
headers, URL, method, cookies, body, params, etc.

Here’s what Express gives you in `req` 👇

| Property       | Description                        | Comes From                  |
| -------------- | ---------------------------------- | --------------------------- |
| `req.method`   | HTTP method (`GET`, `POST`, etc.)  | Raw HTTP line               |
| `req.url`      | Full path (`/api/profile`)         | Raw HTTP line               |
| `req.headers`  | All HTTP headers (object)          | Node’s IncomingMessage      |
| `req.cookies`  | Parsed cookies                     | `cookie-parser` middleware  |
| `req.body`     | Parsed JSON/form body              | `express.json()` middleware |
| `req.query`    | Parsed query string (`?id=123`)    | Express                     |
| `req.params`   | Dynamic route params (`/user/:id`) | Express Router              |
| `req.ip`       | Client IP address                  | Express                     |
| `req.protocol` | `http` or `https`                  | Express                     |
| `req.user`     | (custom, from auth middleware)     | Your code                   |

---

### 🧠 Internally:

When a request arrives (say `GET /api/profile`):

1. Node parses the HTTP headers into `req.headers`
2. Express parses the URL, query params, and route params
3. Middleware like `cookie-parser` parses `Cookie` header into `req.cookies`
4. Middleware like `express.json()` parses request body into `req.body`
5. Your middleware or controller then accesses all of it easily.

Example:

```ts
app.post("/api/profile", (req, res) => {
  console.log(req.method); // POST
  console.log(req.path); // /api/profile
  console.log(req.headers["x-csrf-token"]);
  console.log(req.cookies.csrfToken);
  console.log(req.body); // { name: "Vipin", age: 25 }
});
```

---

# 🧱 PART 4 — Inside the `res` Object (Outgoing Response)

`res` (short for “response”) represents the **server’s reply** to the client.
It’s how you **set headers, cookies, status codes, and send data.**

| Method / Property                  | Purpose                                        |
| ---------------------------------- | ---------------------------------------------- |
| `res.status(code)`                 | Sets HTTP status (e.g., `200`, `401`)          |
| `res.json(obj)`                    | Sends JSON response (auto sets `Content-Type`) |
| `res.send(data)`                   | Sends text, HTML, or JSON automatically        |
| `res.setHeader(name, value)`       | Manually set custom header                     |
| `res.cookie(name, value, options)` | Set a cookie (`Set-Cookie` header)             |
| `res.clearCookie(name)`            | Delete a cookie                                |
| `res.redirect(url)`                | Send redirect response                         |
| `res.end()`                        | Manually finish the response stream            |

---

### 🧠 Internally:

When you call `res.cookie()`:

```ts
res.cookie("token", "abc123", { httpOnly: true, path: "/" });
```

Express constructs a `Set-Cookie` header:

```
Set-Cookie: token=abc123; Path=/; HttpOnly
```

When the response finishes:

- Express writes headers + body to the underlying TCP socket
- Node’s HTTP engine serializes them into proper wire format
- Browser receives headers, stores cookies, and renders data

---

# 🧩 PART 5 — Express Middleware = Bridge Between req & res

Every request in Express travels through a **middleware stack** like this:

```
Request → [parse cookies] → [parse body] → [auth check] → [CSRF check] → [route handler] → Response
```

Each middleware receives `(req, res, next)`:

```ts
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});
```

`next()` passes control to the next middleware.
This is what allows `authenticateUser` to run **before** your route logic.

---

# 🧩 PART 6 — Your Middleware in Context

Let’s look at your `authenticateUser` function in this flow:

```ts
export const authenticateUser = async (req, res, next) => {
  const accessToken = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    req.user = payload; // ✅ add user info to request object
    return verifyCsrfToken(req, res, next);
  } catch (err) {
    ...
  }
};
```

At runtime:

1. Express gives you a **request object** already parsed with cookies + headers
2. You read cookies and headers from it
3. You validate tokens
4. You attach a new property (`req.user`)
5. Then call `next()` to continue the flow.

Your next route (like `/profile`) can now do:

```ts
console.log(req.user.email);
```

because your middleware enriched the request.

---

# 🧩 PART 7 — The Full Request Lifecycle (Visually)

```
┌──────────────────────────┐
│     Browser/Postman      │
│  sends HTTP request ---> │
└──────────────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Node.js HTTP Server      │
│  parses headers, method  │
└──────────────────────────┘
          │
          ▼
┌──────────────────────────┐
│   Express Middleware     │
│ (req, res, next) chain   │
│ - cookie-parser          │
│ - express.json()         │
│ - authenticateUser       │
│ - verifyCsrfToken        │
│ - your route handler     │
└──────────────────────────┘
          │
          ▼
┌──────────────────────────┐
│  Express Response (res)  │
│  sets headers, cookies   │
│  sends JSON or HTML      │
└──────────────────────────┘
          │
          ▼
┌──────────────────────────┐
│  Browser receives it     │
│  updates cookies, UI     │
└──────────────────────────┘
```

---

# 🧠 PART 8 — Internals: How Express Knows When to Send the Response

- `res.send()` or `res.json()` → ends the response stream.
- Once `res.end()` is called, you **can’t modify headers or cookies anymore**.
- Express batches headers until the first body chunk is written.

So when you write:

```ts
res.cookie("token", "123");
res.status(200).json({ message: "OK" });
```

Express internally:

1. Adds a `Set-Cookie` header to a buffer
2. Adds a `Content-Type: application/json` header
3. Serializes `{ message: "OK" }` to a JSON string
4. Writes everything into the TCP socket

---

# 🧩 PART 9 — Summary Table

| Concept      | `req` Side (Incoming)   | `res` Side (Outgoing)                 |
| ------------ | ----------------------- | ------------------------------------- |
| HTTP method  | `req.method`            | —                                     |
| URL          | `req.url` / `req.path`  | —                                     |
| Headers      | `req.headers`           | `res.setHeader()` / `res.getHeader()` |
| Cookies      | `req.cookies`           | `res.cookie()` / `res.clearCookie()`  |
| Query params | `req.query`             | —                                     |
| Body         | `req.body`              | `res.send()` / `res.json()`           |
| Auth state   | `req.user` (set by you) | —                                     |
| Status code  | —                       | `res.status(code)`                    |
| JSON data    | —                       | `res.json(object)`                    |

---

# 🔥 TL;DR Summary

| Layer               | Handles                  | Object                               | Description                                                 |
| ------------------- | ------------------------ | ------------------------------------ | ----------------------------------------------------------- |
| **HTTP protocol**   | The raw text exchange    | —                                    | Defines headers, cookies, and body structure                |
| **Node.js core**    | Parses HTTP into objects | `IncomingMessage` + `ServerResponse` | Raw access to request/response                              |
| **Express.js**      | Extends and simplifies   | `req` + `res`                        | Adds helpers: `req.body`, `req.cookies`, `res.json()`, etc. |
| **Your middleware** | Business logic           | `authenticateUser`, etc.             | Reads headers/cookies, sets response                        |

---

✅ So yes:

- Everything you access (`req.body`, `req.cookies`, `req.headers`, etc.)
  comes from **Express’s enhanced wrapper around Node’s raw HTTP objects**.
- Everything you send (`res.json()`, `res.cookie()`, `res.status()`)
  becomes **HTTP headers + body** sent back to the client.

---
