import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.replace("v1,whsec_", "") || "";
const LOGO_URL = "https://ufsnuobtvkciydftsyff.supabase.co/storage/v1/object/public/email-assets/uplyze-logo.png";
const SITE_URL = "https://uplyze.ai";
const BRAND_NAME = "Uplyze";

interface EmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildConfirmationUrl(emailData: EmailPayload["email_data"]): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const typeMap: Record<string, string> = {
    recovery: "recovery",
    magic_link: "magiclink",
    email_change: "email_change",
    invite: "invite",
    signup: "signup",
  };
  const type = typeMap[emailData.email_action_type] || "signup";
  const redirectTo = emailData.redirect_to || SITE_URL;
  return `${supabaseUrl}/auth/v1/verify?token=${emailData.token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

function getEmailHtml(actionType: string, confirmUrl: string): { subject: string; html: string } {
  const button = (label: string) => `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
      <tr>
        <td style="padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #6366f1); border-radius: 12px;">
          <a href="${confirmUrl}" style="color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; display: block; text-align: center; letter-spacing: 0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;

  const content: Record<string, { subject: string; heading: string; desc: string; btn: string; note: string }> = {
    signup: {
      subject: `${BRAND_NAME} — Verify your email`,
      heading: "Verify Your Email",
      desc: `Welcome to ${BRAND_NAME}! Please verify your email to activate your account.`,
      btn: "Verify Email Address",
      note: "If you didn't create an account, you can safely ignore this email.",
    },
    recovery: {
      subject: `${BRAND_NAME} — Reset your password`,
      heading: "Reset Your Password",
      desc: "We received a request to reset your password. Click below to set a new one.",
      btn: "Reset Password",
      note: "This link expires in 24 hours. If you didn't request this, ignore this email.",
    },
    magic_link: {
      subject: `${BRAND_NAME} — Your magic login link`,
      heading: "Magic Login Link ✨",
      desc: `Click below to sign in to your ${BRAND_NAME} account. No password needed.`,
      btn: "Sign In Now",
      note: "This link expires in 24 hours and can only be used once.",
    },
    invite: {
      subject: `${BRAND_NAME} — You've been invited`,
      heading: "You're Invited! 🎉",
      desc: `You've been invited to join ${BRAND_NAME}. Click below to set up your account.`,
      btn: "Accept Invitation",
      note: "",
    },
    email_change: {
      subject: `${BRAND_NAME} — Confirm email change`,
      heading: "Confirm Email Change",
      desc: `Please confirm your new email address for your ${BRAND_NAME} account.`,
      btn: "Confirm New Email",
      note: "If you didn't request this change, please contact us immediately.",
    },
  };

  const c = content[actionType] || {
    subject: `${BRAND_NAME} — Action Required`,
    heading: "Action Required",
    desc: "Please click the link below to continue.",
    btn: "Continue",
    note: "",
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #030308; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #030308;">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(160deg, rgba(139,92,246,0.35), rgba(59,130,246,0.15) 40%, rgba(139,92,246,0.08) 60%, rgba(236,72,153,0.12)); border-radius: 24px; padding: 1px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #0a0a1a; border-radius: 23px;">

                <!-- Logo -->
                <tr>
                  <td style="padding: 44px 48px 0 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 3px; background: linear-gradient(145deg, #8b5cf6, #6366f1, #3b82f6); border-radius: 20px;">
                          <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="64" height="64" style="border-radius: 17px; display: block; border: 3px solid #0a0a1a;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Brand -->
                <tr>
                  <td style="padding: 20px 48px 0 48px; text-align: center;">
                    <p style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: -0.5px;">${BRAND_NAME}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 48px 28px 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 6px 20px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.18); border-radius: 100px;">
                          <p style="font-size: 10px; color: #a78bfa; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin: 0;">Premium Creator Management</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4) 30%, rgba(59,130,246,0.4) 70%, transparent);"></td></tr></table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 48px 0 48px; text-align: center;">
                    <p style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">${c.heading}</p>
                    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 28px 0; line-height: 1.6;">${c.desc}</p>
                    ${button(c.btn)}
                    ${c.note ? `<p style="font-size: 12px; color: #475569; margin: 24px 0 0 0;">${c.note}</p>` : ""}
                  </td>
                </tr>

                <!-- Footer Divider -->
                <tr>
                  <td style="padding: 36px 40px 0 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: rgba(255,255,255,0.05);"></td></tr></table>
                  </td>
                </tr>

                <!-- Navigation -->
                <tr>
                  <td style="padding: 28px 24px 0 24px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}" style="display: inline-block; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Home</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/services" style="display: inline-block; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Services</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/onboarding" style="display: inline-block; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Get Started</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/admin" style="display: inline-block; padding: 10px 16px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: 10px; color: #a78bfa; font-size: 12px; font-weight: 600; text-decoration: none;">CRM Panel</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Social Icons -->
                <tr>
                  <td style="padding: 24px 48px 0 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 5px;"><a href="https://instagram.com/ozcagency" style="display: inline-block; width: 38px; height: 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; text-align: center; text-decoration: none; line-height: 38px; font-size: 16px;">📸</a></td>
                        <td style="padding: 0 5px;"><a href="https://x.com/ozcagency" style="display: inline-block; width: 38px; height: 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; text-align: center; text-decoration: none; line-height: 38px; font-size: 16px;">𝕏</a></td>
                        <td style="padding: 0 5px;"><a href="https://tiktok.com/@ozcagency" style="display: inline-block; width: 38px; height: 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; text-align: center; text-decoration: none; line-height: 38px; font-size: 16px;">🎵</a></td>
                        <td style="padding: 0 5px;"><a href="mailto:contact@ozcagency.com" style="display: inline-block; width: 38px; height: 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; text-align: center; text-decoration: none; line-height: 38px; font-size: 16px;">✉️</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact -->
                <tr>
                  <td style="padding: 12px 48px 0 48px; text-align: center;">
                    <p style="margin: 0;"><a href="mailto:contact@ozcagency.com" style="font-size: 12px; color: #475569; text-decoration: none;">contact@ozcagency.com</a></p>
                  </td>
                </tr>

                <!-- Bottom line -->
                <tr>
                  <td style="padding: 24px 48px 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: rgba(255,255,255,0.03);"></td></tr></table>
                  </td>
                </tr>

                <!-- Legal -->
                <tr>
                  <td style="padding: 18px 48px 8px 48px; text-align: center;">
                    <p style="font-size: 11px; color: #334155; margin: 0 0 6px 0; font-weight: 500;">&copy; 2026 ${BRAND_NAME}. All rights reserved.</p>
                    <p style="font-size: 10px; margin: 0;">
                      <a href="${SITE_URL}/privacy" style="color: #3f4f63; text-decoration: none;">Privacy</a>
                      <span style="margin: 0 8px; color: #1e293b;">&middot;</span>
                      <a href="${SITE_URL}/terms" style="color: #3f4f63; text-decoration: none;">Terms</a>
                      <span style="margin: 0 8px; color: #1e293b;">&middot;</span>
                      <a href="${SITE_URL}/faq" style="color: #3f4f63; text-decoration: none;">FAQ</a>
                    </p>
                  </td>
                </tr>

                <!-- Compliance -->
                <tr>
                  <td style="padding: 10px 48px 32px 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 4px 12px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); border-radius: 6px;">
                          <p style="font-size: 8px; color: #1e293b; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin: 0;">GDPR &middot; CCPA &middot; CPRA &middot; 18+</p>
                        </td>
                      </tr>
                    </table>
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

  return { subject: c.subject, html };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify webhook signature from Supabase Auth
    let data: EmailPayload;
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      data = wh.verify(payload, headers) as EmailPayload;
    } else {
      // Fallback: try parsing as plain JSON (for testing)
      data = JSON.parse(payload) as EmailPayload;
    }

    const { user, email_data } = data;
    const email = user.email;
    const actionType = email_data.email_action_type;

    console.log(`Processing ${actionType} email for ${email}`);

    const confirmUrl = buildConfirmationUrl(email_data);
    const { subject, html } = getEmailHtml(actionType, confirmUrl);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${BRAND_NAME} <contact@uplyze.ai>`,
        to: [email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    console.log("Resend response:", JSON.stringify(resendData));

    if (!resendRes.ok) {
      console.error("Resend primary domain failed, trying fallback:", JSON.stringify(resendData));
      const fallbackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${BRAND_NAME} <contact@uplyze.ai>`,
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
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email hook error:", error.message);
    // Return 200 so auth flow doesn't break — log the error for debugging
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
