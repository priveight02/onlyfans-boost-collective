import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Instagram, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;

const IGLoginPopup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState<"ready" | "redirecting" | "exchanging">("ready");

  const redirectUri = `${window.location.origin}/ig-login`;

  // Handle OAuth callback code in URL
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
    setStatus("exchanging");
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ig-oauth-callback", {
        body: { code, redirect_uri: redirectUri },
      });

      if (fnError) throw new Error(fnError.message);

      if (!data?.success) {
        setError(data?.error || "Failed to connect Instagram. Please try again.");
        setLoading(false);
        setStatus("ready");
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
      setStatus("ready");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setStatus("redirecting");
    const scope = "instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights";
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Connect Instagram</h1>
          <p className="text-sm text-white/50">Sign in with your Instagram account</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] text-emerald-300">Official Instagram OAuth • Secure & authorized</span>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-lg font-semibold text-white">Connected!</p>
            <p className="text-sm text-white/60">Instagram linked. This window will close automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || status === "redirecting"}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium h-12 rounded-lg transition-all disabled:opacity-50"
            >
              {loading || status !== "ready" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {status === "redirecting" ? "Redirecting to Instagram..." : "Connecting..."}
                </>
              ) : (
                <>
                  <Instagram className="h-5 w-5" />
                  Continue with Instagram
                </>
              )}
            </button>

            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs font-medium text-white/70 mb-2">What happens next:</p>
              {[
                "You'll be redirected to Instagram's official login page",
                "Log in and authorize the app",
                "You'll be redirected back automatically",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mt-0.5">
                    <span className="text-[10px] font-bold text-white">{i + 1}</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Uses Instagram's official OAuth. Your password never touches our servers.
        </p>
      </div>
    </div>
  );
};

export default IGLoginPopup;
