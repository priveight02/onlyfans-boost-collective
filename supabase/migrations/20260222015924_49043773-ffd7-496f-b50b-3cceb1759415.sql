
-- Table to store Shopify OAuth connections
CREATE TABLE public.shopify_store_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT,
  shop_name TEXT,
  shop_email TEXT,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

ALTER TABLE public.shopify_store_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
ON public.shopify_store_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
ON public.shopify_store_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
ON public.shopify_store_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
ON public.shopify_store_connections FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_shopify_connections_updated_at
BEFORE UPDATE ON public.shopify_store_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
