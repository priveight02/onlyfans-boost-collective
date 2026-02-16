import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Paddle: any;
  }
}

// Paddle product/price mapping (sandbox)
export const PADDLE_PLAN_MAP: Record<string, { monthly: { price_id: string; product_id: string }; yearly: { price_id: string; product_id: string } }> = {
  starter: {
    monthly: { price_id: "pri_01khk8854veaqz3jy2nns7c3ng", product_id: "pro_01khk8849zz71cnn6phwezgz6h" },
    yearly:  { price_id: "pri_01khk885axy7sp9jjp7t6pdk1r", product_id: "pro_01khk8849zz71cnn6phwezgz6h" },
  },
  pro: {
    monthly: { price_id: "pri_01khk885fx88k3c7nyydybh13k", product_id: "pro_01khk884je9ssmmgq17m850nt6" },
    yearly:  { price_id: "pri_01khk885y604t14yncgxjrvrxq", product_id: "pro_01khk884je9ssmmgq17m850nt6" },
  },
  business: {
    monthly: { price_id: "pri_01khk88654jq2078qds26my167", product_id: "pro_01khk884s1s79fcga36rfqxexq" },
    yearly:  { price_id: "pri_01khk886apadcebr4p5gtkswab", product_id: "pro_01khk884s1s79fcga36rfqxexq" },
  },
};

export const PADDLE_PRODUCT_TO_PLAN: Record<string, string> = {
  "pro_01khk8849zz71cnn6phwezgz6h": "starter",
  "pro_01khk884je9ssmmgq17m850nt6": "pro",
  "pro_01khk884s1s79fcga36rfqxexq": "business",
};

export const usePaddle = () => {
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initialized.current) return;

    const initPaddle = async () => {
      if (!window.Paddle) {
        console.warn("Paddle.js not loaded");
        return;
      }

      try {
        // Fetch client token from backend
        const { data, error } = await supabase.functions.invoke("paddle-config");
        const token = data?.token;
        if (error || !token || token === '-') {
          console.error("Failed to fetch Paddle client token");
          return;
        }

        window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token });
        initialized.current = true;
        setReady(true);
        console.log("Paddle initialized successfully");
      } catch (e) {
        console.warn("Paddle init error:", e);
      }
    };

    initPaddle();
  }, []);

  const openCheckout = useCallback((options: {
    priceId: string;
    customerId?: string | null;
    customerEmail?: string;
    discountId?: string | null;
    customData?: Record<string, string>;
    onSuccess?: () => void;
  }) => {
    if (!window.Paddle) {
      console.error("Paddle.js not loaded");
      return;
    }

    const checkoutSettings: any = {
      settings: {
        displayMode: "overlay",
        theme: "dark",
        locale: "en",
        successUrl: `${window.location.origin}/pricing?success=true`,
      },
      items: [{ priceId: options.priceId, quantity: 1 }],
    };

    if (options.customerEmail) {
      checkoutSettings.customer = { email: options.customerEmail };
    }

    if (options.discountId) {
      checkoutSettings.discount = { id: options.discountId };
    }

    if (options.customData) {
      checkoutSettings.customData = options.customData;
    }

    window.Paddle.Checkout.open(checkoutSettings);
  }, []);

  return { openCheckout, ready };
};
