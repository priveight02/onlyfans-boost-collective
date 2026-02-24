import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Instagram, CheckCircle2, AlertTriangle } from "lucide-react";

const INSTAGRAM_APP_ID = "1236053517952936";

const IGLoginPopup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [phase, setPhase] = useState<"ig" | "fb_redirect" | "done">("ig");

  const redirectUri = `${window.location.origin}/ig-login`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(params.get("error_description") || "Instagram login was denied.");
      return;
    }

    if (code) {
      handleCodeExchange(code);
    }
  }, []);

  const handleCodeExchange = async (code: string) => {
    setLoading(true);
    setError("");
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ig-oauth-callback", {
        body: { code, redirect_uri: redirectUri },
      });

      if (fnError) {
        setError(fnError.message || "Failed to reach server");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        const errMsg = data?.error || "Failed to connect Instagram. Please try again.";
        const errType = data?.error_type ? `[${data.error_type}] ` : "";
        setError(`${errType}${errMsg}`);
        setErrorCode(data?.error_code || null);
        setLoading(false);
        return;
      }

      const oauthPayload = {
        access_token: data.data.access_token,
        user_id: data.data.user_id,
        username: data.data.username,
        account_type: data.data.account_type,
        expires_in: data.data.expires_in,
        name: data.data.name,
        profile_picture_url: data.data.profile_picture_url,
        token_source: data.data.token_source,
        page_token: data.data.page_token,
        page_id: data.data.page_id,
      };

      // Try to extract session cookies from the browser
      let sessionData: any = null;
      try {
        const allCookies = document.cookie;
        const sessionIdMatch = allCookies.match(/sessionid=([^;]+)/);
        const csrfMatch = allCookies.match(/csrftoken=([^;]+)/);
        const dsUserMatch = allCookies.match(/ds_user_id=([^;]+)/);
        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          const csrfToken = csrfMatch ? csrfMatch[1] : "";
          const dsUserId = dsUserMatch ? dsUserMatch[1] : String(data.data.user_id);
          const { data: sessionResult } = await supabase.functions.invoke("ig-session-login", {
            body: { mode: "validate_session", session_id: sessionId },
          });
          if (sessionResult?.success) {
            sessionData = {
              session_id: sessionId,
              csrf_token: csrfToken || sessionResult.data?.csrf_token || "",
              ds_user_id: dsUserId || sessionResult.data?.ds_user_id || String(data.data.user_id),
            };
          }
        }
      } catch (cookieErr) {
        // Expected on cross-origin
      }

      setSuccess(true);

      // Post IG result to opener
      if (window.opener) {
        window.opener.postMessage({
          type: "IG_SESSION_RESULT",
          source: "oauth",
          payload: {
            ...oauthPayload,
            session_id: sessionData?.session_id || null,
            csrf_token: sessionData?.csrf_token || null,
            ds_user_id: sessionData?.ds_user_id || String(data.data.user_id),
          },
        }, "*");
      }

      // If we already have a page token (e.g. from FB business login), just close
      if (oauthPayload.page_token) {
        setPhase("done");
        setTimeout(() => window.close(), 1500);
        return;
      }

      // Otherwise, redirect THIS popup to Facebook OAuth to get page token
      setPhase("fb_redirect");
      
      // Fetch the Facebook App ID from backend (it's different from Instagram App ID)
      let fbClientId = INSTAGRAM_APP_ID; // fallback
      try {
        const { data: fbAppData } = await supabase.functions.invoke("facebook-api", {
          body: { action: "get_app_id" },
        });
        if (fbAppData?.app_id) fbClientId = fbAppData.app_id;
      } catch {}
      
      setTimeout(() => {
        const fbRedirectUri = "https://uplyze.ai/fb-login";
        const fbScopes = "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_messages,public_profile";
        const fbAuthUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${fbClientId}&redirect_uri=${encodeURIComponent(fbRedirectUri)}&scope=${fbScopes}&response_type=code&state=ig_page_link`;
        window.location.href = fbAuthUrl;
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
          <Instagram className="h-8 w-8 text-white" />
        </div>

        {success && phase === "fb_redirect" ? (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <p className="text-lg font-semibold text-white">Instagram Connected!</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              <p className="text-sm text-blue-300">Redirecting to Facebook for messaging access...</p>
            </div>
          </div>
        ) : success && phase === "done" ? (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-lg font-semibold text-white">Fully Connected!</p>
            <p className="text-sm text-white/60">This window will close automatically.</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
              {errorCode && (
                <p className="text-[10px] text-red-400/60 font-mono ml-6">HTTP {errorCode}</p>
              )}
              <p className="text-[10px] text-white/30 font-mono ml-6 break-all">
                redirect_uri: {redirectUri}
              </p>
            </div>
            <button
              onClick={() => {
                const scopes = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages,instagram_business_manage_insights";
                const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&enable_fb_login=1`;
                window.location.href = authUrl;
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium h-11 rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Loader2 className="h-8 w-8 text-white/70 mx-auto animate-spin" />
            <p className="text-sm text-white/60">
              {loading ? "Connecting your account..." : "Redirecting to Instagram..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IGLoginPopup;
