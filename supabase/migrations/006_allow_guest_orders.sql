-- Allow guest orders by making user_id nullable
-- This enables MVP checkout without requiring user authentication

-- Drop the foreign key constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Make user_id nullable
ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;

-- Re-add foreign key constraint but allow NULL
ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
