-- Seed Orders for Testing Admin Dashboard
-- This script creates sample orders with various statuses and dates
-- Run this in Supabase SQL Editor after products are seeded
-- Note: user_id is NULL for guest orders (MVP allows guest checkout)

-- Generate order number function (helper)
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := UPPER(TO_CHAR(NOW(), 'YYMMDDHH24MISS'));
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  RETURN 'ORD-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Insert sample orders
-- Note: This uses product IDs from the products table
-- Make sure products are seeded first!

INSERT INTO public.orders (
  user_id,
  email,
  order_number,
  status,
  items,
  subtotal,
  shipping,
  tax,
  total,
  shipping_address,
  billing_address,
  payment_method,
  payment_status,
  tracking_number,
  notes,
  created_at
) VALUES
-- Order 1: Paid, Shipped
(
  NULL,
  'john.smith@example.com',
  generate_order_number(),
  'shipped',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products LIMIT 1) p
  ),
  49.99,
  0.00,
  4.00,
  53.99,
  '{"firstName": "John", "lastName": "Smith", "email": "john.smith@example.com", "phone": "555-1234", "address": "123 Main Street", "city": "New York", "state": "NY", "zipCode": "10001", "country": "United States"}'::jsonb,
  '{"firstName": "John", "lastName": "Smith", "email": "john.smith@example.com", "phone": "555-1234", "address": "123 Main Street", "city": "New York", "state": "NY", "zipCode": "10001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK123456789',
  NULL,
  NOW() - INTERVAL '5 days'
),
-- Order 2: Paid, Delivered
(
  NULL,
  'sarah.j@example.com',
  generate_order_number(),
  'delivered',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 2,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products LIMIT 1) p
  ),
  109.98,
  0.00,
  8.80,
  118.78,
  '{"firstName": "Sarah", "lastName": "Johnson", "email": "sarah.j@example.com", "phone": "555-2345", "address": "456 Oak Avenue", "city": "Los Angeles", "state": "CA", "zipCode": "90001", "country": "United States"}'::jsonb,
  '{"firstName": "Sarah", "lastName": "Johnson", "email": "sarah.j@example.com", "phone": "555-2345", "address": "456 Oak Avenue", "city": "Los Angeles", "state": "CA", "zipCode": "90001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK987654321',
  NULL,
  NOW() - INTERVAL '12 days'
),
-- Order 3: Pending Payment, Processing
(
  NULL,
  'mchen@example.com',
  generate_order_number(),
  'processing',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 1) p
  ),
  54.99,
  9.99,
  5.20,
  70.18,
  '{"firstName": "Michael", "lastName": "Chen", "email": "mchen@example.com", "phone": "555-3456", "address": "789 Pine Road", "city": "Chicago", "state": "IL", "zipCode": "60601", "country": "United States"}'::jsonb,
  '{"firstName": "Michael", "lastName": "Chen", "email": "mchen@example.com", "phone": "555-3456", "address": "789 Pine Road", "city": "Chicago", "state": "IL", "zipCode": "60601", "country": "United States"}'::jsonb,
  'credit_card',
  'pending',
  NULL,
  'Please leave at front door',
  NOW() - INTERVAL '2 days'
),
-- Order 4: Paid, Processing
(
  NULL,
  'emily.davis@example.com',
  generate_order_number(),
  'processing',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 2) p
  ),
  39.99,
  9.99,
  4.00,
  53.98,
  '{"firstName": "Emily", "lastName": "Davis", "email": "emily.davis@example.com", "phone": "555-4567", "address": "321 Elm Street", "city": "Houston", "state": "TX", "zipCode": "77001", "country": "United States"}'::jsonb,
  '{"firstName": "Emily", "lastName": "Davis", "email": "emily.davis@example.com", "phone": "555-4567", "address": "321 Elm Street", "city": "Houston", "state": "TX", "zipCode": "77001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  NULL,
  NULL,
  NOW() - INTERVAL '1 day'
),
-- Order 5: Paid, Shipped
(
  NULL,
  'dwilson@example.com',
  generate_order_number(),
  'shipped',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 3,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 0) p
  ),
  149.97,
  0.00,
  12.00,
  161.97,
  '{"firstName": "David", "lastName": "Wilson", "email": "dwilson@example.com", "phone": "555-5678", "address": "654 Maple Drive", "city": "Phoenix", "state": "AZ", "zipCode": "85001", "country": "United States"}'::jsonb,
  '{"firstName": "David", "lastName": "Wilson", "email": "dwilson@example.com", "phone": "555-5678", "address": "654 Maple Drive", "city": "Phoenix", "state": "AZ", "zipCode": "85001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK555666777',
  NULL,
  NOW() - INTERVAL '8 days'
),
-- Order 6: Refunded, Cancelled
(
  NULL,
  'lisa.a@example.com',
  generate_order_number(),
  'cancelled',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 1) p
  ),
  54.99,
  9.99,
  5.20,
  70.18,
  '{"firstName": "Lisa", "lastName": "Anderson", "email": "lisa.a@example.com", "phone": "555-6789", "address": "987 Cedar Lane", "city": "New York", "state": "NY", "zipCode": "10002", "country": "United States"}'::jsonb,
  '{"firstName": "Lisa", "lastName": "Anderson", "email": "lisa.a@example.com", "phone": "555-6789", "address": "987 Cedar Lane", "city": "New York", "state": "NY", "zipCode": "10002", "country": "United States"}'::jsonb,
  'credit_card',
  'refunded',
  NULL,
  NULL,
  NOW() - INTERVAL '25 days'
),
-- Order 7: Paid, Delivered
(
  NULL,
  'rbrown@example.com',
  generate_order_number(),
  'delivered',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 2,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 2) p
  ),
  79.98,
  0.00,
  6.40,
  86.38,
  '{"firstName": "Robert", "lastName": "Brown", "email": "rbrown@example.com", "phone": "555-7890", "address": "147 Birch Court", "city": "Los Angeles", "state": "CA", "zipCode": "90002", "country": "United States"}'::jsonb,
  '{"firstName": "Robert", "lastName": "Brown", "email": "rbrown@example.com", "phone": "555-7890", "address": "147 Birch Court", "city": "Los Angeles", "state": "CA", "zipCode": "90002", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK111222333',
  NULL,
  NOW() - INTERVAL '18 days'
),
-- Order 8: Pending Payment, Pending
(
  NULL,
  'j.taylor@example.com',
  generate_order_number(),
  'pending',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 0) p
  ),
  49.99,
  9.99,
  4.80,
  64.78,
  '{"firstName": "Jennifer", "lastName": "Taylor", "email": "j.taylor@example.com", "phone": "555-8901", "address": "258 Spruce Way", "city": "Chicago", "state": "IL", "zipCode": "60602", "country": "United States"}'::jsonb,
  '{"firstName": "Jennifer", "lastName": "Taylor", "email": "j.taylor@example.com", "phone": "555-8901", "address": "258 Spruce Way", "city": "Chicago", "state": "IL", "zipCode": "60602", "country": "United States"}'::jsonb,
  'credit_card',
  'pending',
  NULL,
  NULL,
  NOW() - INTERVAL '3 hours'
),
-- Order 9: Paid, Shipped
(
  NULL,
  'john.smith@example.com',
  generate_order_number(),
  'shipped',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 3) p
  ),
  59.99,
  0.00,
  4.80,
  64.79,
  '{"firstName": "John", "lastName": "Smith", "email": "john.smith@example.com", "phone": "555-1234", "address": "123 Main Street", "city": "New York", "state": "NY", "zipCode": "10001", "country": "United States"}'::jsonb,
  '{"firstName": "John", "lastName": "Smith", "email": "john.smith@example.com", "phone": "555-1234", "address": "123 Main Street", "city": "New York", "state": "NY", "zipCode": "10001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK444555666',
  NULL,
  NOW() - INTERVAL '15 days'
),
-- Order 10: Paid, Delivered
(
  NULL,
  'sarah.j@example.com',
  generate_order_number(),
  'delivered',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 4) p
  ),
  64.99,
  0.00,
  5.20,
  70.19,
  '{"firstName": "Sarah", "lastName": "Johnson", "email": "sarah.j@example.com", "phone": "555-2345", "address": "456 Oak Avenue", "city": "Los Angeles", "state": "CA", "zipCode": "90001", "country": "United States"}'::jsonb,
  '{"firstName": "Sarah", "lastName": "Johnson", "email": "sarah.j@example.com", "phone": "555-2345", "address": "456 Oak Avenue", "city": "Los Angeles", "state": "CA", "zipCode": "90001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK777888999',
  NULL,
  NOW() - INTERVAL '30 days'
),
-- Order 11: Pending Payment, Processing
(
  NULL,
  'mchen@example.com',
  generate_order_number(),
  'processing',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 2,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 1) p
  ),
  109.98,
  0.00,
  8.80,
  118.78,
  '{"firstName": "Michael", "lastName": "Chen", "email": "mchen@example.com", "phone": "555-3456", "address": "789 Pine Road", "city": "Chicago", "state": "IL", "zipCode": "60601", "country": "United States"}'::jsonb,
  '{"firstName": "Michael", "lastName": "Chen", "email": "mchen@example.com", "phone": "555-3456", "address": "789 Pine Road", "city": "Chicago", "state": "IL", "zipCode": "60601", "country": "United States"}'::jsonb,
  'credit_card',
  'pending',
  NULL,
  NULL,
  NOW() - INTERVAL '7 days'
),
-- Order 12: Paid, Shipped
(
  NULL,
  'emily.davis@example.com',
  generate_order_number(),
  'shipped',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 2) p
  ),
  39.99,
  9.99,
  4.00,
  53.98,
  '{"firstName": "Emily", "lastName": "Davis", "email": "emily.davis@example.com", "phone": "555-4567", "address": "321 Elm Street", "city": "Houston", "state": "TX", "zipCode": "77001", "country": "United States"}'::jsonb,
  '{"firstName": "Emily", "lastName": "Davis", "email": "emily.davis@example.com", "phone": "555-4567", "address": "321 Elm Street", "city": "Houston", "state": "TX", "zipCode": "77001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK000111222',
  NULL,
  NOW() - INTERVAL '22 days'
),
-- Order 13: Paid, Delivered
(
  NULL,
  'dwilson@example.com',
  generate_order_number(),
  'delivered',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 0) p
  ),
  49.99,
  0.00,
  4.00,
  53.99,
  '{"firstName": "David", "lastName": "Wilson", "email": "dwilson@example.com", "phone": "555-5678", "address": "654 Maple Drive", "city": "Phoenix", "state": "AZ", "zipCode": "85001", "country": "United States"}'::jsonb,
  '{"firstName": "David", "lastName": "Wilson", "email": "dwilson@example.com", "phone": "555-5678", "address": "654 Maple Drive", "city": "Phoenix", "state": "AZ", "zipCode": "85001", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  'TRACK333444555',
  NULL,
  NOW() - INTERVAL '45 days'
),
-- Order 14: Pending Payment, Pending
(
  NULL,
  'lisa.a@example.com',
  generate_order_number(),
  'pending',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 1,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 3) p
  ),
  59.99,
  9.99,
  5.60,
  75.58,
  '{"firstName": "Lisa", "lastName": "Anderson", "email": "lisa.a@example.com", "phone": "555-6789", "address": "987 Cedar Lane", "city": "New York", "state": "NY", "zipCode": "10002", "country": "United States"}'::jsonb,
  '{"firstName": "Lisa", "lastName": "Anderson", "email": "lisa.a@example.com", "phone": "555-6789", "address": "987 Cedar Lane", "city": "New York", "state": "NY", "zipCode": "10002", "country": "United States"}'::jsonb,
  'credit_card',
  'pending',
  NULL,
  NULL,
  NOW() - INTERVAL '1 day'
),
-- Order 15: Paid, Processing
(
  NULL,
  'rbrown@example.com',
  generate_order_number(),
  'processing',
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'productId', p.id,
        'productName', p.name,
        'productSlug', p.slug,
        'price', p.price,
        'quantity', 2,
        'image', p.image
      )
    )
    FROM (SELECT id, name, slug, price, image FROM public.products ORDER BY created_at LIMIT 1 OFFSET 4) p
  ),
  129.98,
  0.00,
  10.40,
  140.38,
  '{"firstName": "Robert", "lastName": "Brown", "email": "rbrown@example.com", "phone": "555-7890", "address": "147 Birch Court", "city": "Los Angeles", "state": "CA", "zipCode": "90002", "country": "United States"}'::jsonb,
  '{"firstName": "Robert", "lastName": "Brown", "email": "rbrown@example.com", "phone": "555-7890", "address": "147 Birch Court", "city": "Los Angeles", "state": "CA", "zipCode": "90002", "country": "United States"}'::jsonb,
  'credit_card',
  'paid',
  NULL,
  NULL,
  NOW() - INTERVAL '4 days'
)
ON CONFLICT (order_number) DO NOTHING;

-- Verify the insert
SELECT 
  order_number,
  email,
  status,
  payment_status,
  total,
  created_at
FROM public.orders 
ORDER BY created_at DESC;

-- Clean up the helper function (optional)
-- DROP FUNCTION IF EXISTS generate_order_number();
