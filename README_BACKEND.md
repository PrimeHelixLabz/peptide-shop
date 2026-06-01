# Backend Setup Guide

This project uses Supabase for database, authentication, storage, and edge functions.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL, Publishable key, and Secret key from the Supabase dashboard

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Optional: For admin operations (server-side only)
SUPABASE_SECRET_KEY=your_supabase_secret_key

# Stripe (payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
# Webhook secret for `POST /api/stripe/webhook`
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Link Money (Pay by Bank)
LINK_MONEY_ENV=sandbox
LINK_MONEY_CLIENT_ID=your_link_money_client_id
LINK_MONEY_CLIENT_SECRET=your_link_money_client_secret
LINK_MONEY_REDIRECT_URL=https://yourdomain.com/payments/link-money/callback
LINK_MONEY_WEBHOOK_SECRET=your_link_money_webhook_secret

# CentryOS (hosted checkout via WalletOS)
# Server-side only — never expose CentryOS_API_CLIENT_* in the client bundle.
CENTRYOS_ENV=staging              # staging | production
CENTRYOS_API_CLIENT_ID=your_centryos_client_id
CENTRYOS_API_CLIENT_SECRET=your_centryos_client_secret
CENTRYOS_WEBHOOK_SECRET=your_centryos_webhook_secret
APP_PUBLIC_URL=https://yourdomain.com
# Optional URL overrides (default to the staging/production hosts that
# match CENTRYOS_ENV — only set these if CentryOS gives you a custom host).
# CENTRYOS_ACCOUNT_URL=https://account-staging-api.centryos.xyz
# CENTRYOS_LIQUIDITY_URL=https://liquidity-staging-api.centryos.xyz
```

**CentryOS webhook URL:** point your CentryOS dashboard webhook at
`${APP_PUBLIC_URL}/api/payments/centryos/webhook`. The same value is
sent in each create-link request under `advancedConfig.webhookPath`,
so the hosted checkout will retry against this URL with HMAC-SHA512
signed bodies (`signature` header).

**Where to find these keys:**
- Go to your Supabase project dashboard
- Navigate to **Settings** → **API**
- **Project URL**: Copy the "Project URL"
- **Publishable key**: Copy the "Publishable key" (formerly called "anon key")
- **Secret key**: Copy the "Secret key" (formerly called "service_role key") - Keep this secure!

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql` - Creates all tables, indexes, and RLS policies
   - `supabase/migrations/002_rpc_functions.sql` - Creates RPC functions for search and related products

### 3. Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `uploads`
3. Set the bucket to **Public** (or configure policies as needed)
4. Configure policies:
   - **Upload Policy**: Allow authenticated users to upload
   - **Read Policy**: Allow public read access

### 4. Authentication Setup

Supabase Auth is already configured. The system will:
- Automatically create a profile when a user signs up
- Handle email/password authentication
- Manage sessions via cookies

### 5. Seed Initial Data (Optional)

You can seed products by:
1. Using the Supabase dashboard SQL editor
2. Or creating an admin user and using the API

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with optional category/search filters)
- `GET /api/products/[id]` - Get product by ID
- `GET /api/products/[id]/related` - Get related products
- `GET /api/products/categories` - Get all categories
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/[id]` - Update product (admin only)
- `DELETE /api/products/[id]` - Delete product (admin only)

### Search
- `GET /api/search?q=query&category=category&limit=10` - Search products

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart` - Clear cart
- `PUT /api/cart/[productId]` - Update cart item quantity
- `DELETE /api/cart/[productId]` - Remove item from cart

### Wishlist
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist` - Add item to wishlist
- `DELETE /api/wishlist/[productId]` - Remove item from wishlist

### Orders
- `GET /api/orders` - Get user's orders (or all orders if admin)
- `GET /api/orders/[id]` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/[id]` - Update order (admin only)

### Upload
- `POST /api/upload` - Upload file to Supabase Storage

## RPC Functions

The following RPC functions are available in Supabase:

1. **search_products(search_query, category_filter, limit_count)**
   - Full-text search for products
   - Returns ranked results

2. **get_related_products(product_uuid, limit_count)**
   - Get related products based on category
   - Returns products from same category first

3. **get_cart_total(user_uuid)**
   - Calculate cart subtotal and item count

4. **get_order_stats(start_date, end_date)**
   - Get order statistics (admin only)

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Profiles**: Users can only view/update their own profile
- **Products**: Public read, admin write
- **Cart Items**: Users can only manage their own cart
- **Wishlist Items**: Users can only manage their own wishlist
- **Orders**: Users can view their own orders, admins can view all

## Admin Access

To create an admin user:

1. Register a user normally
2. Go to Supabase dashboard → Table Editor → profiles
3. Update the user's `role` field to `'admin'`

Or use SQL:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## Frontend Integration

The frontend should use the Supabase client for authentication:

```typescript
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
```

For API calls, include the session token in the Authorization header:

```typescript
const response = await fetch('/api/cart', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`
  }
})
```

## Next Steps

1. Set up environment variables
2. Run database migrations
3. Configure storage bucket
4. Test authentication flow
5. Seed initial product data
6. Test API endpoints
