## 🧱 Step 1: Backend Recap (how CSRF works)

Your backend does two things:

1. After login, it sets:

   ```
   Set-Cookie:
     csrfToken=<random_token>; Path=/; HttpOnly; SameSite=Lax;
   ```

2. Then, on any “unsafe” method (`POST`, `PUT`, `DELETE`),
   it expects the header:

   ```
   X-CSRF-Token: <csrfToken>
   ```

So the frontend must:
✅ Send cookies (`credentials: "include"`)
✅ Extract `csrfToken` from cookies
✅ Add it to request headers

---

## ⚙️ Step 2: Create a Universal API Helper

📁 `src/lib/apiClient.ts`

```ts
import Cookies from "js-cookie";

/**
 * A universal fetch wrapper that:
 *  - sends cookies automatically
 *  - attaches CSRF token for non-GET requests
 *  - handles JSON and errors consistently
 */
export const apiClient = async (url: string, options: RequestInit = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const isUnsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  // ✅ Automatically read csrfToken from cookies
  const csrfToken = isUnsafeMethod ? Cookies.get("csrfToken") : undefined;

  const res = await fetch(url, {
    ...options,
    credentials: "include", // ✅ ensures cookies (token, refreshToken, csrfToken) are sent
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), // ✅ add CSRF header if needed
      ...options.headers,
    },
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = result.message || "Something went wrong";
    throw new Error(message);
  }

  return result.data ?? result;
};
```

✅ This handles:

- CSRF automatically for unsafe methods
- Cookies automatically (`credentials: "include"`)
- Error handling & JSON parsing
- Works perfectly with React Query

---

## 🧩 Step 3: Install `js-cookie`

We’ll use it to read cookies from `document.cookie`.

```bash
npm install js-cookie
```

---

## ⚛️ Step 4: Use It in React Query Hooks

Example hook:

📁 `src/hooks/useCategories.ts`

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient("http://localhost:4000/api/category"),
    staleTime: 1000 * 60 * 5,
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newCategory: { name: string; description?: string; parent?: string }) =>
      apiClient("http://localhost:4000/api/category", {
        method: "POST",
        body: JSON.stringify(newCategory),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
```

---

## 🧠 Step 5: Use It in Components

```tsx
import { useCategories, useCreateCategory } from "@/hooks/useCategories";
import { useState } from "react";

export default function CategoryPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();

  const [name, setName] = useState("");

  if (isLoading) return <p>Loading...</p>;

  const handleSubmit = async () => {
    try {
      await createCategory.mutateAsync({ name });
      alert("Category created!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>Categories</h2>
      <ul>
        {categories?.map((cat) => (
          <li key={cat._id}>{cat.name}</li>
        ))}
      </ul>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category name"
      />
      <button onClick={handleSubmit}>Create</button>
    </div>
  );
}
```

✅ Works perfectly:

- Automatically sends `token`, `refreshToken`, and `csrfToken`
- No need to manually add headers
- Handles JSON errors cleanly

---

## ⚙️ Step 6: Backend CORS Settings (important)

Ensure your Express app has this:

```ts
import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:3000", // your frontend URL
    credentials: true, // allow cookies
  }),
);
```

Without `credentials: true`, the cookies (`token`, `csrfToken`) won’t be included in requests.

---

## 🧱 Step 7: Testing Flow

1. Log in → backend sets `token`, `refreshToken`, and `csrfToken` cookies.
2. `apiClient()` automatically attaches cookies on all requests.
3. For POST/PUT/DELETE → it reads the `csrfToken` cookie and adds:

   ```
   X-CSRF-Token: <csrfToken>
   ```

4. Your `verifyCsrfToken` middleware validates it.
5. Frontend never has to manually deal with headers.

---

## ✅ TL;DR — What You Get Now

| Feature                | Done Automatically                |
| ---------------------- | --------------------------------- |
| Cookie-based JWT auth  | ✅ via `credentials: "include"`   |
| CSRF header            | ✅ via `js-cookie` helper         |
| JSON error handling    | ✅ consistent                     |
| Works with React Query | ✅                                |
| Future-safe            | ✅ can handle other routes easily |

---
