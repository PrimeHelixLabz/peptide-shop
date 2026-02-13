# Authentication Implementation Guide

## Overview

Complete authentication system has been implemented for both regular users and administrators, with protected routes and admin dashboard access control.

## Features Implemented

### 1. User Authentication
- ✅ User registration (sign up)
- ✅ User login (sign in)
- ✅ User logout
- ✅ Session management via Supabase Auth
- ✅ Automatic profile creation on signup

### 2. Admin Authentication
- ✅ Admin role checking
- ✅ Admin-only routes protection
- ✅ Admin dashboard access control
- ✅ Admin API endpoint protection

### 3. Protected Routes
- ✅ Middleware for admin routes (`/admin/*`)
- ✅ Server-side authentication checks
- ✅ Automatic redirects for unauthorized access
- ✅ Redirect to sign-in with return URL

### 4. UI Components
- ✅ Sign-in page (`/signin`)
- ✅ Sign-up page (`/signup`)
- ✅ Authentication forms with validation
- ✅ Updated account menu with auth state
- ✅ Loading states and error handling

## File Structure

```
lib/auth/
├── auth-context.tsx          # Client-side auth context & provider
├── supabase-auth.ts          # Server-side auth utilities
└── middleware.ts             # API route protection middleware

components/auth/
├── signin-form.tsx           # Sign-in form component
└── signup-form.tsx           # Sign-up form component

app/(auth)/
├── signin/page.tsx           # Sign-in page
└── signup/page.tsx           # Sign-up page

middleware.ts                  # Next.js middleware for route protection
app/admin/layout.tsx          # Admin layout with auth check
```

## How It Works

### Client-Side Authentication

The `AuthProvider` wraps the entire app and provides:
- `user` - Current authenticated user
- `loading` - Loading state
- `signIn(email, password)` - Sign in function
- `signUp(email, password, name)` - Sign up function
- `signOut()` - Sign out function
- `refreshUser()` - Refresh user data

**Usage in components:**
```tsx
'use client'
import { useAuth } from '@/lib/auth/auth-context'

function MyComponent() {
  const { user, signIn, signOut } = useAuth()
  
  if (!user) {
    return <div>Please sign in</div>
  }
  
  return <div>Welcome, {user.name}!</div>
}
```

### Server-Side Authentication

For server components and API routes:
```tsx
import { getCurrentUser, requireAuth, requireAdmin } from '@/lib/auth/supabase-auth'

// Get current user (returns null if not authenticated)
const user = await getCurrentUser()

// Require authentication (throws if not authenticated)
const user = await requireAuth()

// Require admin role (throws if not admin)
const admin = await requireAdmin()
```

### Route Protection

**Admin Routes:**
- All routes under `/admin/*` are automatically protected
- Middleware checks authentication and admin role
- Redirects to `/signin?redirect=/admin` if not authenticated
- Redirects to `/` if authenticated but not admin

**API Routes:**
- Use `requireAuthMiddleware` for authenticated routes
- Use `requireAdminMiddleware` for admin-only routes
- Use `optionalAuthMiddleware` for optional authentication

**Example:**
```tsx
import { requireAdminMiddleware } from '@/lib/auth/middleware'

export const POST = requireAdminMiddleware(async (req) => {
  // Only admins can access this
  const userId = req.user!.id
  // ... admin logic
})
```

## Admin Access

### Creating an Admin User

1. **Via Supabase Dashboard:**
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```

2. **Via API (if you have admin access):**
   - Use the admin API endpoints to update user roles

### Admin Features

- Access to `/admin` dashboard
- Can create, update, delete products
- Can view and manage all orders
- Can update order status
- Can upload product images

## Authentication Flow

### Sign Up Flow
1. User fills out sign-up form
2. Form submits to `AuthProvider.signUp()`
3. Supabase Auth creates user account
4. Database trigger creates profile with role "user"
5. User is automatically signed in
6. Redirects to home page

### Sign In Flow
1. User fills out sign-in form
2. Form submits to `AuthProvider.signIn()`
3. Supabase Auth validates credentials
4. Session is created and stored in cookies
5. User data is loaded from profile
6. Redirects to home or redirect URL

### Admin Access Flow
1. User navigates to `/admin`
2. Middleware checks authentication
3. If not authenticated → redirect to `/signin?redirect=/admin`
4. If authenticated → check role
5. If not admin → redirect to `/`
6. If admin → allow access

## Environment Variables

Make sure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## Security Features

1. **Row Level Security (RLS):** All database tables have RLS policies
2. **Server-side validation:** All auth checks happen server-side
3. **Protected API routes:** Admin actions require admin middleware
4. **Session management:** Secure cookie-based sessions
5. **Role-based access:** Admin role checked at multiple levels

## Testing Authentication

### Test User Sign Up
1. Navigate to `/signup`
2. Fill in name, email, password
3. Submit form
4. Should redirect to home page
5. Account menu should show user name

### Test Admin Access
1. Create a user account
2. Update user role to "admin" in Supabase
3. Sign in with that account
4. Navigate to `/admin`
5. Should see admin dashboard

### Test Protected Routes
1. Try accessing `/admin` without signing in
2. Should redirect to `/signin?redirect=/admin`
3. After signing in, should redirect back to `/admin`

## Troubleshooting

### User can't sign in
- Check Supabase Auth settings
- Verify email confirmation is not required (or confirm email)
- Check browser console for errors

### Admin can't access dashboard
- Verify user role is set to "admin" in profiles table
- Check middleware is running
- Verify Supabase RLS policies allow profile reads

### Session not persisting
- Check cookie settings in Supabase
- Verify middleware is properly configured
- Check browser cookie settings

## Next Steps

1. **Email Verification:** Add email confirmation flow
2. **Password Reset:** Implement password reset functionality
3. **Social Auth:** Add Google/GitHub OAuth
4. **2FA:** Add two-factor authentication
5. **Activity Logging:** Track admin actions
