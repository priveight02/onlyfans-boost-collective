import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Instagram, CheckCircle2, AlertTriangle } from "lucide-react";

const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;

const IGLoginPopup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const redirectUri = window.location.hostname.includes("ozcagency.com") ? "https://ozcagency.com/ig-login" : "https://onlyfans-boost-collective.lovable.app/ig-login";

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
    // If no code and no error, this page was loaded as a callback — just show loading
  }, []);

  const handleCodeExchange = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ig-oauth-callback", {
        body: { code, redirect_uri: redirectUri },
      });

      if (fnError) throw new Error(fnError.message);

      if (!data?.success) {
        setError(data?.error || "Failed to connect Instagram. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      if (window.opener) {
        window.opener.postMessage({
          type: "IG_SESSION_RESULT",
          payload: {
            access_token: data.data.access_token,
            user_id: data.data.user_id,
            username: data.data.username,
            account_type: data.data.account_type,
          },
        }, "*");
        setTimeout(() => window.close(), 1500);
      }
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

        {success ? (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-lg font-semibold text-white">Connected!</p>
            <p className="text-sm text-white/60">This window will close automatically.</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
            <button
              onClick={() => {
                const scope = "instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights";
                const dynamicRedirect = redirectUri;
                const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(dynamicRedirect)}&scope=${encodeURIComponent(scope)}&response_type=code`;
                if (window.top && window.top !== window) {
                  window.top.location.href = authUrl;
                } else {
                  window.location.href = authUrl;
                }
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
