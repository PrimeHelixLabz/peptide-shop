-- Rename the "tax" column to "service_fee" in the orders table
ALTER TABLE public.orders RENAME COLUMN tax TO service_fee;