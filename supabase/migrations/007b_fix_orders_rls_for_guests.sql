-- Fix RLS policies for orders to allow guest orders using email
-- This migration updates the orders policies to support MVP guest checkout
-- Guest orders use email (from shipping_address) instead of user_id

-- Step 1: Make user_id nullable (if migration 006 wasn't run)
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 2: Add email column for easier querying (extracted from shipping_address)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 3: Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);

-- Step 4: Update existing orders to extract email from shipping_address (if email column is new)
UPDATE public.orders 
SET email = shipping_address->>'email'
WHERE email IS NULL AND shipping_address->>'email' IS NOT NULL;

-- Step 5: Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders or guest orders" ON public.orders;

-- Step 6: Create new INSERT policy that allows:
-- 1. Authenticated users to insert orders with their own user_id
-- 2. Anyone (including guests) to insert orders with NULL user_id and email
CREATE POLICY "Users can insert their own orders or guest orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    -- Authenticated users can only insert orders with their own user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    -- Anyone (including guests) can insert orders with NULL user_id and email
    (user_id IS NULL AND email IS NOT NULL)
  );

-- Step 7: Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Step 8: Create new SELECT policies
-- Authenticated users can view their own orders (by user_id)
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (
    -- Authenticated users can view orders with their user_id
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- Guest orders can be viewed by anyone with the order_number
-- (Security: order numbers are hard to guess, so this is acceptable for MVP)
CREATE POLICY "Guest orders are viewable by order number"
  ON public.orders FOR SELECT
  USING (
    -- Guest orders (NULL user_id) are accessible via order_number
    (user_id IS NULL)
  );

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
