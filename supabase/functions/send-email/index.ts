import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LOGO_URL = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/email-assets/ozc-logo.jpg";
const SITE_URL = "https://ozcagency.com";
const BRAND_NAME = "Ozc Agency";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailFooter = `
<div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td style="padding-bottom: 16px;"><img src="${LOGO_URL}" alt="${BRAND_NAME}" width="36" height="36" style="border-radius: 10px; display: block;" /></td></tr>
    <tr><td>
      <p style="font-size: 13px; color: #a0a0b0; margin: 0 0 4px 0; font-weight: 600;">${BRAND_NAME}</p>
      <p style="font-size: 11px; color: #666680; margin: 0 0 12px 0;">Creator Management · Premium OnlyFans Agency</p>
    </td></tr>
    <tr><td style="padding-bottom: 12px;">
      <a href="${SITE_URL}" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none; margin-right: 6px;">Home</a>
      <a href="${SITE_URL}/services" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none; margin-right: 6px;">Services</a>
      <a href="${SITE_URL}/onboarding" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none; margin-right: 6px;">Get Started</a>
      <a href="${SITE_URL}/admin" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none;">CRM Panel</a>
    </td></tr>
    <tr><td>
      <a href="https://instagram.com/ozcagency" style="color: #666680; font-size: 11px; text-decoration: none; margin-right: 16px;">Instagram</a>
      <a href="mailto:liam@ozcagency.com" style="color: #666680; font-size: 11px; text-decoration: none;">liam@ozcagency.com</a>
    </td></tr>
    <tr><td style="padding-top: 16px;">
      <p style="font-size: 10px; color: #444460; margin: 0; display: inline;">© 2026 ${BRAND_NAME}. Built with ❤️ for creators.</p>
      <span style="font-size: 9px; color: #444460; float: right;">GDPR · CCPA · CPRA · 18+</span>
    </td></tr>
    <tr><td style="padding-top: 12px;">
      <a href="${SITE_URL}/privacy" style="font-size: 10px; color: #555570; text-decoration: none;">Privacy Policy</a>
      <span style="color: #333350; font-size: 10px;"> · </span>
      <a href="${SITE_URL}/terms" style="font-size: 10px; color: #555570; text-decoration: none;">Terms & Conditions</a>
    </td></tr>
  </table>
</div>`;

const wrap = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0a0a14;">
    <tr><td align="center" style="padding: 40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background: #12121f; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
        <tr><td style="padding: 32px 32px 24px 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="48" height="48" style="border-radius: 14px; display: inline-block;" />
          </div>
          ${content}
          ${emailFooter}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

function buildConfirmationUrl(emailData: EmailData): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const type = emailData.email_action_type === "recovery" ? "recovery" :
               emailData.email_action_type === "magic_link" ? "magiclink" :
               emailData.email_action_type === "email_change" ? "email_change" :
               emailData.email_action_type === "invite" ? "invite" :
               "signup";
  const redirectTo = emailData.redirect_to || SITE_URL;
  return `${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

function getEmailContent(actionType: string, confirmUrl: string): { subject: string; html: string } {
  switch (actionType) {
    case "signup":
      return {
        subject: `${BRAND_NAME} — Verify your email address`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Verify Your Email</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Welcome to ${BRAND_NAME}! Please verify your email to activate your account.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Verify Email Address</a>
          </div>
          <p style="color: #666680; font-size: 12px; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
        `),
      };
    case "recovery":
      return {
        subject: `${BRAND_NAME} — Reset your password`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Reset Your Password</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">We received a request to reset your password. Click below to set a new one.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Reset Password</a>
          </div>
          <p style="color: #666680; font-size: 12px; text-align: center;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
        `),
      };
    case "magic_link":
      return {
        subject: `${BRAND_NAME} — Your magic login link`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Magic Login Link ✨</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Click below to sign in to your ${BRAND_NAME} account. No password needed.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Sign In Now</a>
          </div>
          <p style="color: #666680; font-size: 12px; text-align: center;">This link expires in 24 hours and can only be used once.</p>
        `),
      };
    case "invite":
      return {
        subject: `${BRAND_NAME} — You've been invited`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">You're Invited! 🎉</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">You've been invited to join ${BRAND_NAME}. Click below to set up your account.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Accept Invitation</a>
          </div>
        `),
      };
    case "email_change":
      return {
        subject: `${BRAND_NAME} — Confirm email change`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Confirm Email Change</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Please confirm your new email address for your ${BRAND_NAME} account.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Confirm New Email</a>
          </div>
          <p style="color: #666680; font-size: 12px; text-align: center;">If you didn't request this change, please contact us immediately.</p>
        `),
      };
    default:
      return {
        subject: `${BRAND_NAME} — Action Required`,
        html: wrap(`
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Action Required</h1>
          <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Please click the link below to continue.</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Continue</a>
          </div>
        `),
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Full payload keys:", JSON.stringify(Object.keys(payload)));
    console.log("Full payload:", JSON.stringify(payload).substring(0, 1000));

    // Handle multiple possible payload structures:
    // Structure 1 (Supabase Auth Hook): { user: { email }, email_data: { ... } }
    // Structure 2 (Lovable Cloud Hook): payload might nest differently
    const user = payload.user;
    const emailData = payload.email_data;
    
    // Try to extract email from various payload shapes
    const email = user?.email || payload.email || payload.recipient;
    const actionType = emailData?.email_action_type || payload.email_action_type || payload.action_type || payload.type;

    if (!email) {
      console.error("No email found in payload. Full payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({ error: "No recipient email found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailData && !actionType) {
      console.error("No email_data or action type found. Full payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({ error: "No email action data found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build confirmation URL - handle both payload structures
    const effectiveEmailData: EmailData = emailData || {
      token: payload.token || "",
      token_hash: payload.token_hash || "",
      redirect_to: payload.redirect_to || SITE_URL,
      email_action_type: actionType,
      site_url: payload.site_url || SITE_URL,
    };

    const confirmUrl = buildConfirmationUrl(effectiveEmailData);
    const { subject, html } = getEmailContent(actionType, confirmUrl);

    console.log(`Sending ${actionType} email to ${email}`);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ozc Agency <no-reply@ozcagency.com>",
        to: [email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", JSON.stringify(resendData));

    if (!resendRes.ok) {
      console.error("Resend error, trying fallback domain:", JSON.stringify(resendData));
      
      const fallbackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Ozc Agency <onboarding@resend.dev>",
          to: [email],
          subject,
          html,
        }),
      });
      const fallbackData = await fallbackRes.json();
      console.log("Resend fallback response:", JSON.stringify(fallbackData));
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email hook error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
