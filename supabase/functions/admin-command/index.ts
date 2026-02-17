import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) throw new Error("Not an admin");

    const { action, payload } = await req.json();

    // Log the admin action
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_type: "admin",
      action: `admin_command_${action}`,
      entity_type: payload?.entity_type || "system",
      entity_id: payload?.entity_id || null,
      metadata: { action, payload },
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    let result: any = { success: true };

    switch (action) {
      case "toggle_kill_switch": {
        const { key, value } = payload;
        await supabase.from("system_settings").update({ value: JSON.stringify(value), updated_by: user.id }).eq("key", key);
        result = { key, value };
        break;
      }

      case "toggle_model_kill": {
        const { model_id, kill } = payload;
        const { data: before } = await supabase.from("ai_models").select("*").eq("id", model_id).single();
        await supabase.from("ai_models").update({ kill_switch: kill, status: kill ? "paused" : "live" }).eq("id", model_id);
        await supabase.from("audit_logs").insert({
          actor_id: user.id, actor_type: "admin",
          action: kill ? "model_emergency_kill" : "model_restored",
          entity_type: "ai_models", entity_id: model_id,
          before_state: before, after_state: { ...before, kill_switch: kill },
        });
        result = { model_id, killed: kill };
        break;
      }

      case "toggle_feature_flag": {
        const { flag_id, enabled } = payload;
        await supabase.from("feature_flags").update({ enabled }).eq("id", flag_id);
        await supabase.from("feature_flag_evaluations").insert({
          flag_id, user_id: user.id, result: enabled, context: { toggled_by: "admin" },
        });
        result = { flag_id, enabled };
        break;
      }

      case "update_incident_status": {
        const { incident_id, status } = payload;
        const updates: any = { status };
        if (status === "resolved") updates.resolved_at = new Date().toISOString();
        await supabase.from("incidents").update(updates).eq("id", incident_id);
        await supabase.from("incident_updates").insert({
          incident_id, update_type: "status", message: `Status changed to ${status} by admin`, status_change: status, created_by: user.id,
        });
        result = { incident_id, status };
        break;
      }

      case "revoke_session": {
        const { session_id } = payload;
        await supabase.from("admin_sessions").update({ is_active: false, ended_at: new Date().toISOString(), end_reason: "revoked_by_admin" }).eq("id", session_id);
        result = { session_id, revoked: true };
        break;
      }

      case "evaluate_policy": {
        const { policy_name, resource_type, resource_id, requested_action } = payload;
        // Simple policy evaluation - can be extended
        const decision = "allow"; // Default allow for admin actions
        const reason = "Admin override";
        await supabase.from("policy_decisions").insert({
          policy_name, actor_id: user.id, actor_type: "admin",
          resource_type, resource_id, action: requested_action,
          decision, reason, context: payload,
        });
        result = { decision, reason };
        break;
      }

      case "record_health_metric": {
        const { metric_name, metric_value, unit, service, status: healthStatus } = payload;
        await supabase.from("system_health").insert({
          metric_name, metric_value, unit: unit || "ms", service, status: healthStatus || "healthy",
        });
        result = { recorded: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" || error.message === "Not an admin" ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
