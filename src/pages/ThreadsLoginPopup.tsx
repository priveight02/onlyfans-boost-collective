import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const ThreadsLoginPopup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const redirectUri = "https://uplyze.ai/threads-login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(params.get("error_description") || "Threads login was denied.");
      return;
    }

    if (code) {
      handleCode(code);
    }
  }, []);

  const handleCode = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      setSuccess(true);
      if (window.opener) {
        window.opener.postMessage({
          type: "THREADS_OAUTH_RESULT",
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

  const ThreadsIcon = () => (
    <svg viewBox="0 0 192 192" className="h-8 w-8 text-white" fill="currentColor">
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C82.2364 44.745 69.7731 51.1399 62.1022 62.6747L75.7727 71.3821C81.1761 63.5292 89.268 59.6122 97.222 59.6122L97.278 59.6122C106.338 59.6665 113.17 62.4629 117.586 67.8906C120.755 71.7552 122.829 76.9676 123.793 83.4466C117.929 82.4062 111.534 81.9825 104.665 82.1792C82.4856 82.8102 68.1467 94.7389 69.0766 111.163C69.5497 119.502 73.5604 126.721 80.3757 131.552C86.1847 135.684 93.6258 137.742 101.379 137.363C111.344 136.866 119.239 132.871 124.654 125.607C128.641 120.289 131.219 113.485 132.553 104.854C137.467 107.83 141.145 111.752 143.251 116.533C146.886 124.647 147.068 138.247 136.398 148.917C127.051 158.265 115.818 162.697 97.364 162.837C76.7819 162.681 61.5251 156.296 51.2819 143.763C41.6667 131.989 36.6012 115.282 36.4329 94C36.6012 72.7178 41.6667 56.0107 51.2819 44.2365C61.5251 31.7035 76.7819 25.3185 97.364 25.1627C118.093 25.3197 133.627 31.7688 144.198 44.3827C149.359 50.5355 153.27 58.165 155.89 66.9742L170.186 63.0565C167.07 52.5024 162.307 43.4419 156.056 35.9973C142.95 20.4105 124.452 12.4483 97.406 12.2617L97.322 12.2617C70.4367 12.4471 52.17 20.4758 39.3082 36.0914C27.0166 51.012 20.7267 71.2753 20.5331 94.0419L20.5331 94.0419C20.7267 116.725 27.0166 136.988 39.3082 151.909C52.17 167.524 70.4367 175.553 97.322 175.738L97.406 175.738C119.394 175.572 133.776 169.793 145.684 157.885C161.961 141.608 161.496 121.068 156.384 109.483C152.716 101.175 146.059 94.3498 141.537 88.9883ZM100.885 123.532C90.3552 124.072 82.5765 118.403 82.1001 108.85C81.7364 101.638 86.6254 93.2956 104.962 92.7273C107.887 92.6432 110.734 92.7217 113.491 92.957C112.222 107.725 107.531 123.194 100.885 123.532Z"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-pink-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <ThreadsIcon />
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
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:opacity-90 text-white font-medium h-11 rounded-lg transition-all"
            >
              Close & Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Loader2 className="h-8 w-8 text-white/70 mx-auto animate-spin" />
            <p className="text-sm text-white/60">
              {loading ? "Connecting your Threads account..." : "Processing authorization..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadsLoginPopup;
