import { useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    Paddle: any;
  }
}

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';

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

  useEffect(() => {
    if (initialized.current || !window.Paddle) return;
    
    try {
      window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
      });
      initialized.current = true;
    } catch (e) {
      console.warn("Paddle init error:", e);
    }
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

  return { openCheckout };
};
