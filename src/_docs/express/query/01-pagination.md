## 🧱 1. Backend Pagination Recap (already supported)

You can modify your backend like this 👇

```ts
export const getAllCategory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10; // per page
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      Category.find({})
        .populate("parent", "name slug")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: categories,
    });
  } catch (error) {
    handleControllerError(res, error, "Failed to fetch categories");
  }
};
```

✅ Response Example:

```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "page": 2,
  "limit": 5,
  "total": 17,
  "totalPages": 4,
  "data": [
    { "_id": "...", "name": "Electronics" },
    { "_id": "...", "name": "Mobile Phones" }
  ]
}
```

---

## ⚙️ 2. Frontend API Helper with Pagination

Update your existing `apiClient` helper to accept query params easily.

📁 `src/api/category.ts`

```ts
import { apiClient } from "@/lib/apiClient";

export const fetchCategories = async (page = 1, limit = 10) => {
  const url = `http://localhost:4000/api/category?page=${page}&limit=${limit}`;
  const result = await apiClient(url);
  return result;
};
```

✅ This automatically includes cookies & CSRF via your `apiClient`.

---

## ⚛️ 3. React Query Hook for Paginated Categories

📁 `src/hooks/useCategories.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/api/category";

export const useCategories = (page: number, limit = 10) => {
  return useQuery({
    queryKey: ["categories", page, limit],
    queryFn: () => fetchCategories(page, limit),
    keepPreviousData: true, // ✅ keeps old data visible while fetching next page
    staleTime: 1000 * 60 * 2,
  });
};
```

---

## 🧩 4. React Component with Pagination Controls

📁 `src/components/CategoryList.tsx`

```tsx
"use client";

import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";

export default function CategoryList() {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, error, isFetching } = useCategories(page, limit);

  if (isLoading) return <p>Loading categories...</p>;
  if (error) return <p className="text-red-500">Error loading categories</p>;

  const { data: categories, totalPages, total } = data;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">Categories ({total})</h2>

      <ul className="space-y-1">
        {categories.map((cat: any) => (
          <li key={cat._id}>
            <strong>{cat.name}</strong>
            {cat.parent && <span> → {cat.parent.name}</span>}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>

        {isFetching && <span className="ml-2 text-gray-500">Refreshing...</span>}
      </div>
    </div>
  );
}
```

✅ Features:

- Displays total category count
- Pagination buttons (Prev / Next)
- Keeps previous data visible (`keepPreviousData`)
- Shows a “Refreshing…” state when switching pages

---

## ⚙️ 5. Example UI Flow

### ✅ Page 1 Response

```
GET /api/category?page=1&limit=5
```

→ Shows first 5 categories.

### ✅ Click "Next"

```
GET /api/category?page=2&limit=5
```

→ Loads next 5, keeping previous visible during fetch.

---

## 🧠 6. (Optional) Add Page Number Input or Page Size

You can easily extend:

```tsx
<select
  value={limit}
  onChange={(e) => setLimit(Number(e.target.value))}
  className="ml-2 border rounded px-2 py-1"
>
  <option value={5}>5</option>
  <option value={10}>10</option>
  <option value={20}>20</option>
</select>
```

---

## ✅ 7. TL;DR — Pagination Overview

| Layer              | Code                            | Purpose                         |
| ------------------ | ------------------------------- | ------------------------------- |
| **Backend**        | `/api/category?page=1&limit=10` | Uses `.skip()` + `.limit()`     |
| **Frontend fetch** | `fetchCategories(page, limit)`  | Calls backend with query params |
| **React Query**    | `useCategories(page)`           | Auto-caches each page           |
| **UI Component**   | Prev/Next buttons               | Handles navigation              |

---

## 🧩 Bonus — Smooth Loading

If you want a **smooth shimmer loading state** instead of blank refresh,
wrap your list in a skeleton:

```tsx
{isLoading || isFetching ? (
  <p>Loading categories...</p>
) : (
  categories.map(...)
)}
```

---

**implement infinite scroll pagination**

## ⚙️ 1. Backend (Already Ready ✅)

You already have a paginated backend route:

```http
GET /api/category?page=1&limit=10
```

It returns:

```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "page": 1,
  "limit": 10,
  "total": 35,
  "totalPages": 4,
  "data": [ ...10 categories... ]
}
```

✅ No backend changes needed — infinite scroll works with this same endpoint.

---

## ⚛️ 2. React Query Infinite Query Hook

React Query provides `useInfiniteQuery` for exactly this.

📁 `src/hooks/useInfiniteCategories.ts`

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

const fetchCategories = async ({ pageParam = 1 }) => {
  const res = await apiClient(`http://localhost:4000/api/category?page=${pageParam}&limit=10`);
  return res;
};

export const useInfiniteCategories = () => {
  return useInfiniteQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1; // next page number
      }
      return undefined; // stop fetching
    },
  });
};
```

✅ What happens:

- Fetches `/api/category?page=1` initially.
- When scrolled near the end, calls `/api/category?page=2`, then 3, etc.
- Stops when `page >= totalPages`.

---

## 🧩 3. Create the Infinite Scroll Component

📁 `src/components/InfiniteCategoryList.tsx`

```tsx
"use client";

import { useRef, useEffect } from "react";
import { useInfiniteCategories } from "@/hooks/useInfiniteCategories";

export default function InfiniteCategoryList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteCategories();

  const observerRef = useRef<HTMLDivElement | null>(null);

  // 👇 Trigger next page load when observer is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [fetchNextPage, hasNextPage]);

  if (status === "loading") return <p>Loading categories...</p>;
  if (status === "error") return <p className="text-red-500">Error loading categories</p>;

  const allCategories = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-2">Categories (Infinite Scroll)</h2>

      <ul className="space-y-2">
        {allCategories.map((cat: any) => (
          <li key={cat._id} className="p-2 bg-gray-100 rounded">
            <strong>{cat.name}</strong>
            {cat.parent && <span className="text-gray-500"> → {cat.parent.name}</span>}
          </li>
        ))}
      </ul>

      {/* 👇 Loader div triggers next fetch when visible */}
      <div ref={observerRef} className="mt-4 text-center">
        {isFetchingNextPage
          ? "Loading more..."
          : hasNextPage
            ? "Scroll down to load more"
            : "No more categories"}
      </div>
    </div>
  );
}
```

✅ Features:

- Loads new pages automatically when scrolling.
- Uses **Intersection Observer** (no external libraries).
- Keeps old data visible during fetch.
- Stops when no `hasNextPage`.

---

## 🧠 4. How It Works

| Step  | What Happens                                      |
| ----- | ------------------------------------------------- |
| 🟢 1. | `useInfiniteQuery` loads page 1                   |
| 🔵 2. | Intersection Observer watches the bottom `<div>`  |
| 🟣 3. | When visible, it triggers `fetchNextPage()`       |
| 🟠 4. | Next 10 results append to the list                |
| 🔴 5. | Stops when `getNextPageParam` returns `undefined` |

---

## ⚙️ 5. Optional — Smooth Loading UX

You can add a loading skeleton or animation during `isFetchingNextPage`:

```tsx
{
  isFetchingNextPage && (
    <p className="text-center text-gray-400 mt-2 animate-pulse">Loading more categories...</p>
  );
}
```

Or even add a loading spinner (e.g., from `@/components/ui/spinner` if you use ShadCN).

---

## 💎 6. Optional — Variable Limit Support

If you want to dynamically control `limit`:

```ts
const fetchCategories = async ({ pageParam = 1, limit = 10 }) => {
  const res = await apiClient(
    `http://localhost:4000/api/category?page=${pageParam}&limit=${limit}`,
  );
  return res;
};
```

And then call:

```ts
useInfiniteCategories(15); // 15 per page
```

---

## ✅ 7. Full Flow Summary

| Step | Layer                    | What Happens                                               |
| ---- | ------------------------ | ---------------------------------------------------------- |
| 1    | **Backend**              | `GET /api/category?page=1&limit=10` returns paginated data |
| 2    | **React Query**          | `useInfiniteQuery` handles page tracking                   |
| 3    | **IntersectionObserver** | Detects when you reach the bottom                          |
| 4    | **fetchNextPage()**      | Automatically loads next set of categories                 |
| 5    | **UI**                   | Smooth infinite list of results with no page reload        |

---

## 🧩 Example UI Output

```
Electronics
Mobile Phones → Electronics
Laptops → Electronics
Headphones → Electronics
...
Loading more...
```

✅ Auto-loads new items when you scroll down.
✅ Stops gracefully when all data is fetched.

---

## ⚙️ 8. Bonus — Integrate with Filters or Search

You can easily extend infinite pagination with filters:

```ts
const fetchCategories = async ({ pageParam = 1, queryKey }) => {
  const [_key, { search }] = queryKey;
  const res = await apiClient(
    `http://localhost:4000/api/category?page=${pageParam}&limit=10&search=${search}`,
  );
  return res;
};

export const useInfiniteCategories = (search = "") =>
  useInfiniteQuery({
    queryKey: ["categories", { search }],
    queryFn: fetchCategories,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
```

✅ Now the infinite list automatically refreshes on search.

---

## ✅ TL;DR — Infinite Scroll Pagination Setup

| Layer    | Tool                                 | Purpose                     |
| -------- | ------------------------------------ | --------------------------- |
| Backend  | Same `/api/category?page=1&limit=10` | Paginates results           |
| Hook     | `useInfiniteQuery`                   | Manages page fetching logic |
| Frontend | `IntersectionObserver`               | Triggers load on scroll     |
| UI       | Renders all loaded pages             | Seamless infinite list      |

---
