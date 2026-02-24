import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const FacebookLoginPopup = () => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUri = "https://uplyze.ai/fb-login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");
    const state = params.get("state");

    if (errorParam) {
      setError(params.get("error_description") || "Facebook login was denied.");
      return;
    }

    if (code) {
      handleCode(code, state || undefined);
    }
  }, []);

  const handleCode = async (code: string, state?: string) => {
    setLoading(true);
    setError("");
    try {
      setSuccess(true);
      if (window.opener) {
        window.opener.postMessage({
          type: "FB_OAUTH_RESULT",
          payload: { code, redirect_uri: redirectUri, source: state || "direct" },
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
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-90 text-white font-medium h-11 rounded-lg transition-all"
            >
              Close & Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Loader2 className="h-8 w-8 text-white/70 mx-auto animate-spin" />
            <p className="text-sm text-white/60">
              {loading ? "Connecting your Facebook account..." : "Processing authorization..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookLoginPopup;
