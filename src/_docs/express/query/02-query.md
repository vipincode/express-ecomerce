## 🧱 1. Your Backend Endpoint

You already have:

```
GET http://localhost:4000/api/category
```

It returns:

```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "_id": "6710c58fa2efb98e9a76e77a",
      "name": "Electronics",
      "slug": "electronics",
      "parent": null
    },
    {
      "_id": "6710c5dea2efb98e9a76e781",
      "name": "Mobile Phones",
      "slug": "mobile-phones",
      "parent": {
        "_id": "6710c58fa2efb98e9a76e77a",
        "name": "Electronics",
        "slug": "electronics"
      }
    }
  ]
}
```

---

## ⚙️ 2. Basic Fetch in Frontend (React or Next.js)

If you’re just testing or want a simple setup:

```ts
// src/api/category.ts
export const fetchCategories = async () => {
  const res = await fetch("http://localhost:4000/api/category", {
    method: "GET",
    credentials: "include", // 👈 important: includes cookies (token, csrf)
  });

  if (!res.ok) throw new Error("Failed to fetch categories");

  const data = await res.json();
  return data.data; // return just the array
};
```

### ✅ Why `credentials: "include"`?

Because your backend uses cookies for auth (`token`, `refreshToken`, `csrfToken`),
so you need to explicitly allow them to be sent with the request.

---

## ⚛️ 3. Use It in a React Component

```tsx
import { useEffect, useState } from "react";
import { fetchCategories } from "@/api/category";

export default function CategoryList() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p>Loading categories...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Categories</h2>
      <ul>
        {categories.map((cat) => (
          <li key={cat._id}>
            <strong>{cat.name}</strong>
            {cat.parent && <span className="text-gray-500"> → {cat.parent.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

✅ This will:

- Fetch your categories from Express
- Display parent relationships
- Handle loading and error states gracefully

---

## ⚡ 4. (Recommended) Use React Query for Production

If you’re already using React Query (TanStack Query), it’s cleaner and automatically caches, retries, and manages loading states.

### Install:

```bash
npm install @tanstack/react-query
```

### Setup your provider (if not already done):

```tsx
// app/providers.tsx or main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

---

### Create your React Query Hook

📁 `src/hooks/useCategories.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/api/category";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

---

### Use It in Your Component

```tsx
import { useCategories } from "@/hooks/useCategories";

export default function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error loading categories</p>;

  return (
    <ul>
      {categories?.map((cat) => (
        <li key={cat._id}>
          <strong>{cat.name}</strong>
          {cat.parent && <span> → {cat.parent.name}</span>}
        </li>
      ))}
    </ul>
  );
}
```

✅ Benefits:

- Automatic caching
- Background refetching
- Error + loading management handled
- Instant UI updates

---

## 🔒 5. Authenticated Requests (Important for Your Backend Setup)

Since your Express API requires cookies for JWT and CSRF, make sure your **frontend requests always send cookies**:

### For all fetch calls:

```ts
fetch("http://localhost:4000/api/category", {
  method: "GET",
  credentials: "include", // ✅ sends cookies (token, refreshToken, csrfToken)
});
```

And ensure **CORS** is configured correctly on your backend:

```ts
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

This allows your frontend (running on port 3000) to send and receive cookies securely.

---

## 🧩 6. Example Frontend Response Handling

If you use your standardized backend responses (`{ success, message, data }`),
you can make a small helper:

📁 `src/lib/apiClient.ts`

```ts
export const apiClient = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const result = await res.json();

  if (!res.ok) throw new Error(result.message || "Something went wrong");

  return result.data;
};
```

Then your hook becomes even simpler:

```ts
export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient("http://localhost:4000/api/category"),
  });
};
```

---

## ✅ TL;DR — Frontend Integration Summary

| Task                      | Tool                     | Example                                                                   |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| Simple Fetch              | `fetch()`                | `fetch("http://localhost:4000/api/category", { credentials: "include" })` |
| React Query (Recommended) | `useQuery`               | `useQuery(["categories"], fetchCategories)`                               |
| Send cookies              | `credentials: "include"` | Always include cookies for auth                                           |
| CORS                      | Backend                  | `app.use(cors({ origin: "http://localhost:3000", credentials: true }))`   |
| Central API client        | Custom helper            | Wraps fetch + error handling                                              |

---
