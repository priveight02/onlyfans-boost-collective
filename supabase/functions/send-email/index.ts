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

// SVG social icons as data URIs
const IG_ICON = `<span style="color:#818cf8;font-size:13px;font-weight:700;letter-spacing:0.5px;">IG</span>`;
function socialIcon(icon: string, href: string) {
  return `<td style="padding:0 4px;">
    <a href="${href}" style="display:inline-block;width:36px;height:36px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;text-align:center;text-decoration:none;line-height:36px;" target="_blank">${icon}</a>
  </td>`;
}

function getEmailHtml(actionType: string, confirmUrl: string): { subject: string; html: string } {
  const button = (label: string) => `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="padding:14px 44px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:14px;box-shadow:0 4px 20px rgba(99,102,241,0.35),0 0 0 1px rgba(139,92,246,0.2);">
          <a href="${confirmUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;text-align:center;letter-spacing:0.3px;">${label}</a>
        </td>
      </tr>
    </table>`;

  const content: Record<string, { subject: string; heading: string; desc: string; btn: string; note: string }> = {
    signup: {
      subject: `${BRAND_NAME} | Verify your email`,
      heading: "Verify Your Email",
      desc: `Welcome to ${BRAND_NAME}. Please verify your email address to activate your account and get started.`,
      btn: "Verify Email Address",
      note: "If you didn't create an account, you can safely ignore this email.",
    },
    recovery: {
      subject: `${BRAND_NAME} | Reset your password`,
      heading: "Reset Your Password",
      desc: "We received a request to reset your password. Click the button below to choose a new one.",
      btn: "Reset Password",
      note: "This link expires in 24 hours. If you didn't request this, ignore this email.",
    },
    magic_link: {
      subject: `${BRAND_NAME} | Your magic login link`,
      heading: "Magic Login Link",
      desc: `Click below to sign in to your ${BRAND_NAME} account instantly. No password needed.`,
      btn: "Sign In Now",
      note: "This link expires in 24 hours and can only be used once.",
    },
    invite: {
      subject: `${BRAND_NAME} | You've been invited`,
      heading: "You're Invited",
      desc: `You've been invited to join ${BRAND_NAME}. Click below to set up your account and get started.`,
      btn: "Accept Invitation",
      note: "",
    },
    email_change: {
      subject: `${BRAND_NAME} | Confirm email change`,
      heading: "Confirm Email Change",
      desc: `Please confirm your new email address for your ${BRAND_NAME} account.`,
      btn: "Confirm New Email",
      note: "If you didn't request this change, please contact us immediately.",
    },
  };

  const c = content[actionType] || {
    subject: `${BRAND_NAME} | Action Required`,
    heading: "Action Required",
    desc: "Please click the link below to continue.",
    btn: "Continue",
    note: "",
  };

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#060a14;background-image:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(139,92,246,0.10) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(59,130,246,0.06) 0%,transparent 60%);">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(180deg,rgba(15,17,30,0.95) 0%,rgba(10,12,22,0.98) 100%);border:1px solid rgba(99,102,241,0.15);border-radius:24px;overflow:hidden;box-shadow:0 0 80px rgba(99,102,241,0.08),0 0 40px rgba(139,92,246,0.05);">
                <tr><td style="height:2px;background:linear-gradient(90deg,transparent,#6366f1 20%,#8b5cf6 50%,#6366f1 80%,transparent);"></td></tr>
                <tr>
                  <td style="padding:36px 40px 0 40px;" align="center">
                    <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="56" height="56" style="border-radius:16px;display:block;" />
                    <p style="color:#ffffff;font-size:20px;font-weight:700;margin:14px 0 6px 0;letter-spacing:0.3px;">${BRAND_NAME}</p>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:5px 16px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15));border:1px solid rgba(99,102,241,0.25);border-radius:20px;">
                          <span style="color:#a5b4fc;font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;">AI-Powered Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px 0 40px;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 40px 36px 40px;text-align:center;">
                    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 10px 0;">${c.heading}</h1>
                    <p style="color:rgba(255,255,255,0.55);font-size:15px;margin:0 0 32px 0;line-height:1.65;">${c.desc}</p>
                    ${button(c.btn)}
                    ${c.note ? `<p style="color:rgba(255,255,255,0.28);font-size:12px;margin:24px 0 0 0;line-height:1.5;">${c.note}</p>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 40px 16px 40px;">
                    <a href="${SITE_URL}" style="display:inline-block;padding:7px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:rgba(255,255,255,0.5);font-size:12px;font-weight:500;text-decoration:none;margin:0 3px 6px 3px;">Home</a>
                    <a href="${SITE_URL}/services" style="display:inline-block;padding:7px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:rgba(255,255,255,0.5);font-size:12px;font-weight:500;text-decoration:none;margin:0 3px 6px 3px;">Services</a>
                    <a href="${SITE_URL}/pricing" style="display:inline-block;padding:7px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:rgba(255,255,255,0.5);font-size:12px;font-weight:500;text-decoration:none;margin:0 3px 6px 3px;">Pricing</a>
                    <a href="${SITE_URL}/platform" style="display:inline-block;padding:7px 16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:10px;color:#a5b4fc;font-size:12px;font-weight:500;text-decoration:none;margin:0 3px 6px 3px;">CRM Panel</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 40px 20px 40px;">
                    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
                      <tr>
                        ${socialIcon(IG_ICON, "https://instagram.com/uplyze.ai")}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 28px 40px;">
                    <p style="font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px 0;">contact@uplyze.ai</p>
                    <p style="font-size:10px;color:rgba(255,255,255,0.18);margin:0;">
                      &copy; 2026 ${BRAND_NAME}. All rights reserved. &middot;
                      <a href="${SITE_URL}/privacy" style="color:rgba(255,255,255,0.25);text-decoration:none;">Privacy</a> &middot;
                      <a href="${SITE_URL}/terms" style="color:rgba(255,255,255,0.25);text-decoration:none;">Terms</a>
                    </p>
                  </td>
                </tr>
                <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.2),transparent);"></td></tr>
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
