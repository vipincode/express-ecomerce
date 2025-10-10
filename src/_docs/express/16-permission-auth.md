## 🧩 Step 1: Update Your User Schema

You already have a good start:

```ts
role: { type: String, enum: ["user", "admin"], default: "user" },
```

To add **fine-grained permissions**, you can extend this with a `permissions` array (optional, for advanced control).

✅ Example:

```ts
const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "manager"], default: "user" },
    permissions: [{ type: String }], // e.g. ["read:users", "create:products"]
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

---

## 🧩 Step 2: Add Role & Permission Utility

Create a utility file like `src/utils/roles.ts`:

```ts
// src/utils/roles.ts
export const roles = {
  user: {
    can: ["read:self"],
  },
  manager: {
    can: ["read:self", "update:self", "read:users"],
  },
  admin: {
    can: ["read:self", "read:users", "create:users", "delete:users"],
  },
};
```

This defines what **each role can do**.

---

## 🧩 Step 3: Create a Middleware for Role/Permission Checking

Here’s a simple reusable middleware:

```ts
// src/middleware/authorize.ts
import { Request, Response, NextFunction } from "express";
import { roles } from "../utils/roles";
import { AuthenticatedRequest } from "../types/express";

export const authorize =
  (requiredPermission: string) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = user.role;
    const rolePermissions = roles[role]?.can || [];

    if (!rolePermissions.includes(requiredPermission)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    next();
  };
```

> `AuthenticatedRequest` is just a type-extended version of `Request` that includes `user`.

```ts
// src/types/express.d.ts
import { IUser } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}
```

---

## 🧩 Step 4: Add Authentication Middleware (JWT)

Your existing `verifyToken` middleware should decode the JWT and attach the user object to `req.user`.

Example:

```ts
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
```

---

## 🧩 Step 5: Protect Routes Using Role or Permission

Now you can combine middlewares like this:

```ts
import express from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = express.Router();

// Only verified users
router.get("/profile", authenticate, authorize("read:self"), getProfile);

// Only admins can delete users
router.delete("/users/:id", authenticate, authorize("delete:users"), deleteUser);
```

---

## 🧩 Step 6: (Optional) Assign Permissions Dynamically

If you want admins to give or revoke permissions per user, you can use the `permissions` array in the schema:

```ts
if (user.permissions.includes(requiredPermission)) {
  return next();
}
```

Modify your `authorize` middleware:

```ts
const hasPermission =
  rolePermissions.includes(requiredPermission) || user.permissions.includes(requiredPermission);

if (!hasPermission) {
  return res.status(403).json({ message: "Forbidden" });
}
```

---

## ✅ Example Flow Summary

| Action              | Required Permission | Role Allowed         |
| ------------------- | ------------------- | -------------------- |
| GET `/profile`      | `read:self`         | user, manager, admin |
| GET `/users`        | `read:users`        | manager, admin       |
| POST `/users`       | `create:users`      | admin only           |
| DELETE `/users/:id` | `delete:users`      | admin only           |

---

## 🧠 Bonus Tip: Simplify with Role-Based Middleware Only

If you don’t need granular permissions, use a simpler version:

```ts
export const allowRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
```

Usage:

```ts
router.delete("/users/:id", authenticate, allowRoles("admin"), deleteUser);
```

---
