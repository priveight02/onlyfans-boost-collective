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

// SVG social icons as data URIs for maximum email client compatibility
const IG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
const X_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#a78bfa"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
const TIKTOK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#a78bfa"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.38-6.2V9.06a8.16 8.16 0 0 0 4.84 1.58V7.19a4.85 4.85 0 0 1-1-.5z"/></svg>`;
const MAIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

function socialIcon(svg: string, href: string) {
  return `<td style="padding: 0 4px;">
    <a href="${href}" style="display: inline-block; width: 36px; height: 36px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15); border-radius: 10px; text-align: center; text-decoration: none; line-height: 36px; vertical-align: middle;" target="_blank">
      <img src="data:image/svg+xml;base64,${btoa(svg)}" width="18" height="18" style="display: inline-block; vertical-align: middle; margin-top: 9px;" alt="" />
    </a>
  </td>`;
}

function getEmailHtml(actionType: string, confirmUrl: string): { subject: string; html: string } {
  const button = (label: string) => `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
      <tr>
        <td style="padding: 14px 40px; background: linear-gradient(135deg, #7c3aed, #6366f1); border-radius: 12px; box-shadow: 0 4px 24px rgba(124,58,237,0.35);">
          <a href="${confirmUrl}" style="color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; display: block; text-align: center; letter-spacing: 0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;

  const content: Record<string, { subject: string; heading: string; desc: string; btn: string; note: string }> = {
    signup: {
      subject: `${BRAND_NAME} — Verify your email`,
      heading: "Verify Your Email",
      desc: `Welcome to ${BRAND_NAME}. Please verify your email address to activate your account and get started.`,
      btn: "Verify Email Address",
      note: "If you didn't create an account, you can safely ignore this email.",
    },
    recovery: {
      subject: `${BRAND_NAME} — Reset your password`,
      heading: "Reset Your Password",
      desc: "We received a request to reset your password. Click the button below to choose a new one.",
      btn: "Reset Password",
      note: "This link expires in 24 hours. If you didn't request this, ignore this email.",
    },
    magic_link: {
      subject: `${BRAND_NAME} — Your magic login link`,
      heading: "Magic Login Link",
      desc: `Click below to sign in to your ${BRAND_NAME} account instantly. No password needed.`,
      btn: "Sign In Now",
      note: "This link expires in 24 hours and can only be used once.",
    },
    invite: {
      subject: `${BRAND_NAME} — You've been invited`,
      heading: "You're Invited",
      desc: `You've been invited to join ${BRAND_NAME}. Click below to set up your account and get started.`,
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
<body style="margin: 0; padding: 0; background-color: #020208; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #020208;">
    <tr>
      <td align="center" style="padding: 48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 540px; width: 100%;">
          <!-- Gradient border wrapper -->
          <tr>
            <td style="background: linear-gradient(160deg, rgba(139,92,246,0.4), rgba(59,130,246,0.15) 35%, rgba(139,92,246,0.06) 65%, rgba(99,102,241,0.15)); border-radius: 24px; padding: 1px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(180deg, #0c0c1d 0%, #08081a 100%); border-radius: 23px;">

                <!-- Logo + Brand Header -->
                <tr>
                  <td style="padding: 48px 48px 0 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 3px; background: linear-gradient(145deg, #8b5cf6, #6366f1, #3b82f6); border-radius: 22px; box-shadow: 0 0 32px rgba(139,92,246,0.2);">
                          <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="68" height="68" style="border-radius: 19px; display: block; border: 3px solid #0c0c1d;" />
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 22px 0 0 0; letter-spacing: -0.5px;">${BRAND_NAME}</p>
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 14px auto 0 auto;">
                      <tr>
                        <td style="padding: 6px 22px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.15); border-radius: 100px;">
                          <p style="font-size: 9px; color: #a78bfa; text-transform: uppercase; letter-spacing: 3.5px; font-weight: 700; margin: 0;">Premium Creator Management</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Accent divider -->
                <tr>
                  <td style="padding: 28px 48px 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.35) 25%, rgba(99,102,241,0.4) 50%, rgba(59,130,246,0.35) 75%, transparent);"></td></tr></table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 36px 48px 0 48px; text-align: center;">
                    <p style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; letter-spacing: -0.3px;">${c.heading}</p>
                    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 32px 0; line-height: 1.7;">${c.desc}</p>
                    ${button(c.btn)}
                    ${c.note ? `<p style="font-size: 12px; color: #475569; margin: 28px 0 0 0; line-height: 1.5;">${c.note}</p>` : ""}
                  </td>
                </tr>

                <!-- Footer Divider -->
                <tr>
                  <td style="padding: 40px 44px 0 44px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: rgba(255,255,255,0.04);"></td></tr></table>
                  </td>
                </tr>

                <!-- Navigation Pills -->
                <tr>
                  <td style="padding: 28px 24px 0 24px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}" style="display: inline-block; padding: 10px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Home</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/services" style="display: inline-block; padding: 10px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Services</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/onboarding" style="display: inline-block; padding: 10px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: #64748b; font-size: 12px; font-weight: 500; text-decoration: none;">Get Started</a></td>
                        <td style="padding: 0 3px;"><a href="${SITE_URL}/admin" style="display: inline-block; padding: 10px 18px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.18); border-radius: 10px; color: #a78bfa; font-size: 12px; font-weight: 600; text-decoration: none;">Platform</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Social Icons -->
                <tr>
                  <td style="padding: 24px 48px 0 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        ${socialIcon(IG_ICON, "https://instagram.com/uplyze.ai")}
                        ${socialIcon(X_ICON, "https://x.com/uplyze_ai")}
                        ${socialIcon(TIKTOK_ICON, "https://tiktok.com/@uplyze.ai")}
                        ${socialIcon(MAIL_ICON, "mailto:contact@uplyze.ai")}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact email -->
                <tr>
                  <td style="padding: 14px 48px 0 48px; text-align: center;">
                    <p style="margin: 0;"><a href="mailto:contact@uplyze.ai" style="font-size: 12px; color: #64748b; text-decoration: none; font-weight: 500;">contact@uplyze.ai</a></p>
                  </td>
                </tr>

                <!-- Bottom divider -->
                <tr>
                  <td style="padding: 24px 48px 0 48px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="height: 1px; background: rgba(255,255,255,0.03);"></td></tr></table>
                  </td>
                </tr>

                <!-- Legal footer -->
                <tr>
                  <td style="padding: 20px 48px 8px 48px; text-align: center;">
                    <p style="font-size: 11px; color: #334155; margin: 0 0 8px 0; font-weight: 500;">&copy; 2026 ${BRAND_NAME}. All rights reserved.</p>
                    <p style="font-size: 10px; margin: 0 0 6px 0;">
                      <a href="${SITE_URL}/privacy" style="color: #475569; text-decoration: none;">Privacy</a>
                      <span style="margin: 0 8px; color: #1e293b;">&middot;</span>
                      <a href="${SITE_URL}/terms" style="color: #475569; text-decoration: none;">Terms</a>
                      <span style="margin: 0 8px; color: #1e293b;">&middot;</span>
                      <a href="${SITE_URL}/faq" style="color: #475569; text-decoration: none;">FAQ</a>
                    </p>
                  </td>
                </tr>

                <!-- Compliance badge -->
                <tr>
                  <td style="padding: 8px 48px 36px 48px; text-align: center;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 5px 14px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); border-radius: 6px;">
                          <p style="font-size: 8px; color: #334155; letter-spacing: 2.5px; font-weight: 700; text-transform: uppercase; margin: 0;">GDPR &middot; CCPA &middot; CPRA &middot; 18+</p>
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

    let data: EmailPayload;
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      data = wh.verify(payload, headers) as EmailPayload;
    } else {
      data = JSON.parse(payload) as EmailPayload;
    }

    const { user, email_data } = data;
    const email = user.email;
    const actionType = email_data.email_action_type;

    console.log(`Processing ${actionType} email for ${email}`);

    const confirmUrl = buildConfirmationUrl(email_data);
    const { subject, html } = getEmailHtml(actionType, confirmUrl);

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
      console.error("Resend failed:", JSON.stringify(resendData));
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send email hook error:", error.message);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});