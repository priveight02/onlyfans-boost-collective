import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  registrations_paused: boolean;
  logins_paused: boolean;
  maintenance_mode: boolean;
}

const DEFAULT: SiteSettings = {
  registrations_paused: false,
  logins_paused: false,
  maintenance_mode: false,
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("setting_key, setting_value");
    if (data) {
      const map: any = {};
      (data as any[]).forEach((r: any) => {
        map[r.setting_key] = r.setting_value;
      });
      setSettings({
        registrations_paused: map.registrations_paused ?? false,
        logins_paused: map.logins_paused ?? false,
        maintenance_mode: map.maintenance_mode ?? false,
      });
    }
    setLoading(false);
  };

  const updateSetting = async (key: keyof SiteSettings, value: boolean) => {
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq("setting_key", key);
    if (error) throw error;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
