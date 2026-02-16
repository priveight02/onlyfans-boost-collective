
CREATE TABLE public.custom_credit_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credits INTEGER NOT NULL,
  volume_discount_percent INTEGER NOT NULL DEFAULT 0,
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  unit_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(credits, volume_discount_percent)
);

-- RLS: only service_role can access
ALTER TABLE public.custom_credit_products ENABLE ROW LEVEL SECURITY;
