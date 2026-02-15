import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://ozcagency.com/lovable-uploads/ozc-agency-logo.jpg";
const SITE_URL = "https://ozcagency.com";
const BRAND_NAME = "Ozc Agency";
const SUPPORT_EMAIL = "contact@ozcagency.com";

const emailFooter = `
  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #1a1a2e;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding-bottom: 16px;">
          <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="36" height="36" style="border-radius: 10px; display: block;" />
        </td>
      </tr>
      <tr>
        <td>
          <p style="font-size: 13px; color: #a0a0b0; margin: 0 0 4px 0; font-weight: 600;">${BRAND_NAME}</p>
          <p style="font-size: 11px; color: #666680; margin: 0 0 12px 0;">Creator Management · Premium OnlyFans Agency</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 12px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right: 8px;">
                <a href="${SITE_URL}" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none;">Home</a>
              </td>
              <td style="padding-right: 8px;">
                <a href="${SITE_URL}/services" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none;">Services</a>
              </td>
              <td style="padding-right: 8px;">
                <a href="${SITE_URL}/onboarding" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none;">Get Started</a>
              </td>
              <td style="padding-right: 8px;">
                <a href="${SITE_URL}/admin" style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #a0a0b0; font-size: 11px; text-decoration: none;">CRM Panel</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right: 16px;">
                <a href="https://instagram.com/ozcagency" style="color: #666680; font-size: 11px; text-decoration: none;">Instagram</a>
              </td>
              <td style="padding-right: 16px;">
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #666680; font-size: 11px; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="font-size: 10px; color: #444460; margin: 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. Built with ❤️ for creators.</p>
              </td>
              <td style="text-align: right;">
                <span style="font-size: 9px; color: #444460;">GDPR · CCPA · CPRA · 18+</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 12px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right: 8px;">
                <a href="${SITE_URL}/privacy" style="font-size: 10px; color: #555570; text-decoration: none;">Privacy Policy</a>
              </td>
              <td style="padding-right: 8px; color: #333350; font-size: 10px;">·</td>
              <td>
                <a href="${SITE_URL}/terms" style="font-size: 10px; color: #555570; text-decoration: none;">Terms & Conditions</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const baseWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #0a0a14;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background: #12121f; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="48" height="48" style="border-radius: 14px; display: inline-block;" />
              </div>
              ${content}
              ${emailFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  confirmation: (data) => ({
    subject: `${BRAND_NAME} — Verify your email address`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Verify Your Email</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Welcome to ${BRAND_NAME}! Please verify your email to activate your account.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.confirmation_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Verify Email Address</a>
      </div>
      <p style="color: #666680; font-size: 12px; text-align: center;">If you didn't create an account, you can safely ignore this email.</p>
    `),
  }),

  recovery: (data) => ({
    subject: `${BRAND_NAME} — Reset your password`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Reset Your Password</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">We received a request to reset your password. Click below to set a new one.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.confirmation_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Reset Password</a>
      </div>
      <p style="color: #666680; font-size: 12px; text-align: center;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
    `),
  }),

  magic_link: (data) => ({
    subject: `${BRAND_NAME} — Your magic login link`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Magic Login Link ✨</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Click below to sign in to your ${BRAND_NAME} account. No password needed.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.confirmation_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Sign In Now</a>
      </div>
      <p style="color: #666680; font-size: 12px; text-align: center;">This link expires in 24 hours and can only be used once.</p>
    `),
  }),

  email_change: (data) => ({
    subject: `${BRAND_NAME} — Confirm email change`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Confirm Email Change</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">Please confirm your new email address for your ${BRAND_NAME} account.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.confirmation_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Confirm New Email</a>
      </div>
      <p style="color: #666680; font-size: 12px; text-align: center;">If you didn't request this change, please contact us immediately.</p>
    `),
  }),

  invite: (data) => ({
    subject: `${BRAND_NAME} — You've been invited`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">You're Invited! 🎉</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 24px 0;">You've been invited to join ${BRAND_NAME}. Click below to set up your account.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${data.confirmation_url}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #9333ea); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px;">Accept Invitation</a>
      </div>
    `),
  }),

  google_unlink: (data) => ({
    subject: `${BRAND_NAME} — Confirm Google account unlink`,
    html: baseWrapper(`
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Confirm Google Unlink</h1>
      <p style="color: #a0a0b0; font-size: 14px; text-align: center; margin: 0 0 6px 0;">You've requested to unlink Google from your ${BRAND_NAME} account.</p>
      <div style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15); border-radius: 10px; padding: 14px; margin: 16px 0;">
        <p style="color: #f87171; font-size: 12px; margin: 0; text-align: center;">⚠️ After unlinking, you'll need to use your email and password to sign in.</p>
      </div>
      <p style="color: #a0a0b0; font-size: 13px; text-align: center; margin: 0 0 20px 0;">Use this code to confirm:</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 14px 28px; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); border-radius: 10px; color: #c4b5fd; font-size: 28px; font-weight: 700; letter-spacing: 6px; font-family: monospace;">${data.code || "------"}</span>
      </div>
      <p style="color: #666680; font-size: 12px; text-align: center;">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
    `),
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, confirmation_url, code, metadata } = await req.json();

    const templateFn = templates[type];
    if (!templateFn) {
      return new Response(JSON.stringify({ error: `Unknown template type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = templateFn({ confirmation_url, code, email, ...metadata });

    // Use Supabase's built-in email sending via admin API
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // For now, return the rendered template for the auth hook to use
    return new Response(JSON.stringify({ subject, html, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
