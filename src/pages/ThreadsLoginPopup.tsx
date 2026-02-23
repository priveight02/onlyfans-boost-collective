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
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.256 1.33-3.058.88-.766 2.072-1.213 3.453-1.298.988-.06 1.946.009 2.854.166-.09-.478-.244-.892-.464-1.228-.355-.544-.903-.822-1.63-.826h-.032c-.568 0-1.3.174-1.92.844l-1.378-1.34c.93-.957 2.1-1.463 3.3-1.463h.058c2.816.017 3.858 2.163 4.072 3.534.118.753.144 1.58.086 2.47l-.012.174c.548.396 1.016.867 1.38 1.412.675 1.009 1.087 2.31.876 4.086-.262 2.213-1.518 4.078-3.543 5.252C17.408 23.35 14.987 24 12.186 24zm.267-7.907c-1.033.06-2.263.422-2.604 1.985.256.253.727.545 1.403.584 1.09.06 1.88-.334 2.35-1.17.267-.478.432-1.075.485-1.777a8.456 8.456 0 0 0-1.634.378z"/>
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
