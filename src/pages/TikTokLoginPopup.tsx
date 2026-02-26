import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Music2 } from "lucide-react";

const TikTokLoginPopup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const redirectUri = "https://uplyze.ai/tt-login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");
    const state = params.get("state");

    if (errorParam) {
      const errorMessage = params.get("error_description") || "TikTok login was denied.";
      setError(errorMessage);
      if (window.opener) {
        window.opener.postMessage({
          type: "TT_OAUTH_RESULT",
          payload: { error: errorMessage, redirect_uri: redirectUri },
        }, "*");
        setTimeout(() => window.close(), 1200);
      }
      return;
    }

    // Verify CSRF state
    if (state) {
      const savedState = sessionStorage.getItem("tt_csrf");
      if (savedState && savedState !== state) {
        const securityError = "Security check failed. Please try again.";
        setError(securityError);
        if (window.opener) {
          window.opener.postMessage({
            type: "TT_OAUTH_RESULT",
            payload: { error: securityError, redirect_uri: redirectUri },
          }, "*");
          setTimeout(() => window.close(), 1200);
        }
        return;
      }
    }

    if (code) {
      handleCodeExchange(code);
    }
  }, []);

  const handleCodeExchange = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      // We pass code to opener which handles the exchange with client_key/secret
      setSuccess(true);

      if (window.opener) {
        window.opener.postMessage({
          type: "TT_OAUTH_RESULT",
          payload: { code, redirect_uri: redirectUri },
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
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#25F4EE] via-[#FE2C55] to-[#000] flex items-center justify-center shadow-lg shadow-pink-500/30">
          <Music2 className="h-8 w-8 text-white" />
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
              onClick={() => window.close()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] hover:opacity-90 text-white font-medium h-11 rounded-lg transition-all"
            >
              Close & Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Loader2 className="h-8 w-8 text-white/70 mx-auto animate-spin" />
            <p className="text-sm text-white/60">
              {loading ? "Connecting your TikTok account..." : "Processing authorization..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TikTokLoginPopup;
