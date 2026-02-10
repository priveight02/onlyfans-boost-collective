import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useVisitorTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      try {
        await supabase.functions.invoke("track-visit", {
          body: { page_path: location.pathname, type: "visit" },
        });
      } catch {
        // Silent fail - no trace in console
      }
    };
    track();
  }, [location.pathname]);
};

export const trackAdminLogin = async (email: string, success: boolean) => {
  try {
    await supabase.functions.invoke("track-visit", {
      body: { type: "admin_login", email, success },
    });
  } catch {
    // Silent fail
  }
};
