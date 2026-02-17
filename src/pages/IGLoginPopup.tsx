import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Instagram, Shield, CheckCircle2, AlertTriangle, ExternalLink, Copy, Cookie } from "lucide-react";

const COOKIE_INSTRUCTIONS = [
  { step: 1, text: 'Click "Open Instagram" below & log in normally' },
  { step: 2, text: "Once logged in, press F12 (or right-click → Inspect) to open DevTools" },
  { step: 3, text: 'Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)' },
  { step: 4, text: 'Under Cookies → https://www.instagram.com, find "sessionid"' },
  { step: 5, text: "Copy the sessionid value and paste it below" },
];

const IGLoginPopup = () => {
  const [sessionCookie, setSessionCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"intro" | "paste">("intro");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenInstagram = () => {
    window.open("https://www.instagram.com/accounts/login/", "_blank");
    setStep("paste");
  };

  const handleValidateSession = async () => {
    const sid = sessionCookie.trim();
    if (!sid) {
      setError("Please paste your sessionid cookie value");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ig-session-login", {
        body: { mode: "validate_session", session_id: sid },
      });

      if (fnError) throw new Error(fnError.message);

      if (!data?.success) {
        setError(data?.error || "Invalid or expired session. Make sure you copied the correct sessionid value.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      if (window.opener) {
        window.opener.postMessage({
          type: "IG_SESSION_RESULT",
          payload: {
            session_id: data.data.session_id,
            csrf_token: data.data.csrf_token,
            ds_user_id: data.data.ds_user_id,
            username: data.data.username,
          },
        }, "*");
        setTimeout(() => window.close(), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Validation failed. Try again.");
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-white/50">Log in on Instagram, then paste your session cookie</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] text-emerald-300">Session validated server-side • Password never touches our servers</span>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-lg font-semibold text-white">Connected!</p>
            <p className="text-sm text-white/60">Session synced. This window will close automatically.</p>
          </div>
        ) : step === "intro" ? (
          <div className="space-y-4">
            {/* Steps */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Cookie className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/90">How it works</span>
              </div>
              {COOKIE_INSTRUCTIONS.map(({ step: s, text }) => (
                <div key={s} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center mt-0.5">
                    <span className="text-[10px] font-bold text-white">{s}</span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleOpenInstagram}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium h-11 gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Instagram & Log In
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Re-show mini instructions */}
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-300 leading-relaxed">
                <strong>After logging in:</strong> Open DevTools (F12) → Application tab → Cookies → instagram.com → copy the <code className="bg-purple-500/20 px-1 py-0.5 rounded text-purple-200">sessionid</code> value.
              </p>
            </div>

            {/* Paste field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Session ID Cookie</label>
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={sessionCookie}
                  onChange={(e) => setSessionCookie(e.target.value)}
                  placeholder="Paste sessionid value here..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/50 pr-10 font-mono text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.readText().then(t => setSessionCookie(t)).catch(() => {})}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  title="Paste from clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <Button
              onClick={handleValidateSession}
              disabled={loading || !sessionCookie.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium h-11"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Validating session...</>
              ) : (
                "Connect Session"
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("https://www.instagram.com/accounts/login/", "_blank")}
                className="flex-1 border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 gap-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Re-open Instagram
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep("intro"); setError(""); setSessionCookie(""); }}
                className="flex-1 text-white/50 hover:text-white/80 text-xs"
              >
                ← Back
              </Button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Your password never touches our servers. Only the session cookie is used for API access.
        </p>
      </div>
    </div>
  );
};

export default IGLoginPopup;
