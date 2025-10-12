## 🧩 1. Your backend API endpoint

From your controller:

```ts
router.get("/products", getAllProduct);
```

You can call it like:

```
GET /api/products?page=2&limit=10&sortBy=price&order=asc&category=6708a12b3f...&search=iphone
```

---

## ✅ 2. Expected backend response

Your backend returns:

```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "totalPages": 5,
  "currentPage": 2,
  "hasNextPage": true,
  "hasPrevPage": true,
  "data": [
    {
      "_id": "6708a12b3f...",
      "name": "iPhone 16 Pro",
      "slug": "iphone-16-pro",
      "price": 1499,
      "category": { "name": "Phones", "slug": "phones" },
      "createdBy": { "username": "admin", "email": "admin@example.com" }
    }
  ]
}
```

---

## ⚙️ 3. Frontend setup (TypeScript + React Query + Axios)

Let’s assume:

- You’re using **Next.js or React**
- You have an Axios instance configured

### 🧠 Define your types

```ts
// types/product.ts
export interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  category: {
    name: string;
    slug: string;
  };
  createdBy: {
    username: string;
    email: string;
  };
}

export interface PaginatedProducts {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  data: Product[];
}
```

---

### 🧩 API function

```ts
// api/products.ts
import axios from "axios";
import { PaginatedProducts } from "../types/product";

interface ProductQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  category?: string;
  search?: string;
}

export const fetchProducts = async (params?: ProductQueryParams) => {
  const response = await axios.get<PaginatedProducts>("/api/products", { params });
  return response.data;
};
```

✅ Axios automatically serializes the `params` object into query string parameters.

---

### ⚡ Example usage with React Query

```tsx
// hooks/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../api/products";
import { PaginatedProducts } from "../types/product";

export const useProducts = (params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  category?: string;
}) => {
  return useQuery<PaginatedProducts>({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
    keepPreviousData: true, // keeps old data while fetching next page
  });
};
```

---

### 🧩 Example Component (React)

```tsx
import React, { useState } from "react";
import { useProducts } from "../hooks/useProducts";

export const ProductList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useProducts({
    page,
    limit: 10,
    search,
    sortBy,
    order,
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Products</h2>

      <input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th onClick={() => setSortBy("name")}>Name</th>
            <th onClick={() => setSortBy("price")}>Price</th>
            <th>Category</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>${p.price}</td>
              <td>{p.category?.name}</td>
              <td>{p.createdBy?.username}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {data?.currentPage} of {data?.totalPages}
        </span>
        <button disabled={!data?.hasNextPage} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## ✅ 4. Example requests the frontend will make

```http
GET /api/products?page=1&limit=10&sortBy=createdAt&order=desc
GET /api/products?page=2&limit=10&search=iphone
GET /api/products?category=6708a12b3f...&sortBy=price&order=asc
```

---

## ✅ 5. Works beautifully with pagination + sorting + search

| Feature         | Controlled by     | Example                                |
| --------------- | ----------------- | -------------------------------------- |
| Pagination      | `page`, `limit`   | `/api/products?page=2&limit=20`        |
| Sorting         | `sortBy`, `order` | `/api/products?sortBy=price&order=asc` |
| Search          | `search`          | `/api/products?search=iphone`          |
| Category filter | `category`        | `/api/products?category=6708a12b3f...` |

---

## ✅ TL;DR Summary

| Layer                 | Example                                                           |
| --------------------- | ----------------------------------------------------------------- |
| **Backend**           | `GET /api/products?page=2&search=iphone&sortBy=price&order=asc`   |
| **Frontend API call** | `axios.get("/api/products", { params: { page, limit, search } })` |
| **React Query hook**  | `useProducts({ page, search, sortBy, order })`                    |
| **Component**         | Renders products, handles pagination + search                     |

---
