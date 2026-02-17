import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  registrations_paused: boolean;
  logins_paused: boolean;
  maintenance_mode: boolean;
  maintenance_end_time: string | null;
  hide_pricing: boolean;
  read_only_mode: boolean;
  force_password_reset: boolean;
}

const DEFAULT: SiteSettings = {
  registrations_paused: false,
  logins_paused: false,
  maintenance_mode: false,
  maintenance_end_time: null,
  hide_pricing: false,
  read_only_mode: false,
  force_password_reset: false,
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("setting_key, setting_value, setting_meta");
    if (data) {
      const map: any = {};
      const metaMap: any = {};
      (data as any[]).forEach((r: any) => {
        map[r.setting_key] = r.setting_value;
        metaMap[r.setting_key] = r.setting_meta;
      });
      setSettings({
        registrations_paused: map.registrations_paused ?? false,
        logins_paused: map.logins_paused ?? false,
        maintenance_mode: map.maintenance_mode ?? false,
        maintenance_end_time: metaMap.maintenance_mode || null,
        hide_pricing: map.hide_pricing ?? false,
        read_only_mode: map.read_only_mode ?? false,
        force_password_reset: map.force_password_reset ?? false,
      });
    }
    setLoading(false);
  };

  const updateSetting = async (key: string, value: boolean) => {
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq("setting_key", key);
    if (error) throw error;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateMaintenanceEndTime = async (endTime: string | null) => {
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({ setting_meta: endTime || null, updated_at: new Date().toISOString() })
      .eq("setting_key", "maintenance_mode");
    if (error) throw error;
    setSettings((prev) => ({ ...prev, maintenance_end_time: endTime }));
  };

  useEffect(() => {
    fetchSettings();

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

  return { settings, loading, updateSetting, updateMaintenanceEndTime, refetch: fetchSettings };
};
