-- Widen orders.payment_status to surface intermediate Link Money states
-- (authorized, processing) so admins can see in-flight payments.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'authorized', 'processing', 'paid', 'failed', 'refunded'));
