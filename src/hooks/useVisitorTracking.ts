import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useVisitorTracking = () => {
  // PAUSED: Site visit tracking disabled to reduce database usage
  // const location = useLocation();
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
