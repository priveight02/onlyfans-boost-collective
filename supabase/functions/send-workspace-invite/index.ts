import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LOGO_URL = "https://ozcagency.com/lovable-uploads/ozc-agency-logo.jpg";
const SITE_URL = "https://onlyfans-boost-collective.lovable.app";
const BRAND_NAME = "Ozc Agency";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function buildInviteEmail(email: string, role: string, permissions: string[], inviterName: string, onboardingUrl: string): { subject: string; html: string } {
  const permList = permissions.length > 0 
    ? permissions.map(p => `<li style="color: #94a3b8; font-size: 13px; padding: 3px 0;">${p.replace(/_/g, ' ')}</li>`).join("") 
    : '<li style="color: #94a3b8; font-size: 13px;">Standard access</li>';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #030308; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #030308;">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(160deg, rgba(139,92,246,0.35), rgba(59,130,246,0.15) 40%, rgba(139,92,246,0.08) 60%, rgba(236,72,153,0.12)); border-radius: 24px; padding: 1px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a1a; border-radius: 23px;">
                <tr>
                  <td style="padding: 44px 48px 0 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 3px; background: linear-gradient(145deg, #8b5cf6, #6366f1, #3b82f6); border-radius: 20px;">
                          <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="64" height="64" style="border-radius: 17px; display: block; border: 3px solid #0a0a1a;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 48px 0 48px; text-align: center;">
                    <p style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0;">${BRAND_NAME}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 48px 28px 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 6px 20px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.18); border-radius: 100px;">
                          <p style="font-size: 10px; color: #34d399; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin: 0;">Team Invitation</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4) 30%, rgba(59,130,246,0.4) 70%, transparent);"></td></tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 48px 0 48px; text-align: center;">
                    <p style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">You've Been Invited</p>
                    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.6;">
                      <strong style="color: #a78bfa;">${inviterName}</strong> has invited you to join ${BRAND_NAME} as a <strong style="color: #34d399;">${role}</strong>.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 12px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; text-align: left;">
                          <p style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 8px 0;">Granted Permissions</p>
                          <ul style="margin: 0; padding: 0 0 0 16px;">${permList}</ul>
                        </td>
                      </tr>
                    </table>
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 14px 36px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px;">
                          <a href="${onboardingUrl}" style="color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; display: block; text-align: center;">Complete Your Onboarding</a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 12px; color: #475569; margin: 24px 0 0 0;">This invitation link expires in 24 hours and can only be used once.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 48px 32px 48px; text-align: center;">
                    <p style="font-size: 11px; color: #334155; margin: 0;">&copy; 2026 ${BRAND_NAME}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: `${BRAND_NAME} — You've been invited to join the team`, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Admin check
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) throw new Error("Not an admin");

    const { email, role, permissions } = await req.json();
    if (!email || !role) throw new Error("Email and role required");

    // Generate unique token
    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Get inviter name
    const { data: inviterProfile } = await supabase.from("profiles").select("display_name, email").eq("user_id", user.id).single();
    const inviterName = inviterProfile?.display_name || inviterProfile?.email || "Admin";

    // Insert invitation
    const { data: invitation, error: invError } = await supabase
      .from("workspace_invitations")
      .insert({
        email: email.toLowerCase().trim(),
        role,
        permissions: permissions || [],
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt,
        status: "pending",
      })
      .select()
      .single();

    if (invError) throw new Error(invError.message);

    // Build onboarding URL
    const onboardingUrl = `${SITE_URL}/admin-onboarding/${inviteToken}`;

    // Send email via Resend
    const { subject, html } = buildInviteEmail(email, role, permissions || [], inviterName, onboardingUrl);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${BRAND_NAME} <contact@ozcagency.com>`,
        to: [email.toLowerCase().trim()],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", JSON.stringify(resendData));

    // Log activity
    await supabase.from("workspace_activity_log").insert({
      actor_id: user.id,
      action: "invite_sent",
      target_type: "invitation",
      target_id: invitation.id,
      details: { email, role, permissions, token: inviteToken },
    });

    return new Response(JSON.stringify({ success: true, invitation_id: invitation.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" || error.message === "Not an admin" ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
