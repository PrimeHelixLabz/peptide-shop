# Products API Layer

This directory contains the abstraction layer for product data access. The current implementation uses mock data, but it's designed to be easily replaced with real API calls.

## Structure

- **`types.ts`** - TypeScript interfaces for products
- **`mock-data.ts`** - Mock product data for development
- **`products.ts`** - API functions (currently using mock data)

## Switching to Real API

To connect to a real API, update the functions in `products.ts`:

### Example: Replace `getAllProducts()`

```typescript
// Before (mock)
export async function getAllProducts(): Promise<ProductDetail[]> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return mockProducts
}

// After (real API)
export async function getAllProducts(): Promise<ProductDetail[]> {
  const response = await fetch(`${API_BASE_URL}/products`)
  if (!response.ok) throw new Error('Failed to fetch products')
  return response.json()
}
```

### Example: Replace `getProductById()`

```typescript
// Before (mock)
export async function getProductById(id: string): Promise<ProductDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return mockProducts.find((p) => p.id === id) || null
}

// After (real API)
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`)
  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Failed to fetch product')
  }
  return response.json()
}
```

## Product Specifications

Products use a dynamic `specifications` object instead of fixed fields. This allows flexibility in what data is stored:

```typescript
{
  id: "example",
  name: "Example Product",
  specifications: {
    purity: "99.1%",
    weight: "5mg",
    form: "Lyophilized",
    sequence: "Gly-Glu-Pro-Pro...",
    // Add any other dynamic fields
  }
}
```

Components access specifications via `product.specifications?.purity`, etc.

## Benefits

1. **Easy API Migration** - Just update functions in `products.ts`
2. **Type Safety** - TypeScript interfaces ensure consistency
3. **Flexible Data** - Dynamic specifications support any product attributes
4. **Backward Compatible** - Existing code continues to work via `lib/products.ts`
