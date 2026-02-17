import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Instagram, Shield, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";

/**
 * This page is opened as a popup window from the Social Media Hub.
 * It performs a server-side Instagram login via our edge function,
 * captures the session tokens, and sends them back to the parent window.
 */
const IGLoginPopup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorIdentifier, setTwoFactorIdentifier] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: any = { username: username.trim(), password };
      if (twoFactorRequired && verificationCode) {
        body.verification_code = verificationCode;
        body.two_factor_identifier = twoFactorIdentifier;
      }

      const { data, error: fnError } = await supabase.functions.invoke("ig-session-login", { body });

      if (fnError) throw new Error(fnError.message);

      if (data?.two_factor_required) {
        setTwoFactorRequired(true);
        setTwoFactorIdentifier(data.two_factor_identifier || "");
        setError("Enter the 2FA code sent to your device.");
        setLoading(false);
        return;
      }

      if (data?.checkpoint_required) {
        setError(data.error || "Security checkpoint required. Complete it in the Instagram app, then try again.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Login failed. Check your credentials.");
        setLoading(false);
        return;
      }

      // Success! Send session data back to parent window
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

        // Close after a short delay so user sees success
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
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Connect Instagram</h1>
          <p className="text-sm text-white/50">Log in to automatically sync your session</p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] text-emerald-300">Encrypted server-side login • Credentials never stored</span>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-lg font-semibold text-white">Connected!</p>
            <p className="text-sm text-white/60">Session synced. This window will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {!twoFactorRequired ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Username or Email</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/50"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/50 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">2FA Verification Code</label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/50 text-center text-lg tracking-widest"
                  maxLength={8}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                />
                <p className="text-[10px] text-white/40 text-center">Check your authenticator app or SMS</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium h-11"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {twoFactorRequired ? "Verifying..." : "Connecting..."}</>
              ) : (
                twoFactorRequired ? "Verify & Connect" : "Log In & Connect"
              )}
            </Button>

            {twoFactorRequired && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setTwoFactorRequired(false); setVerificationCode(""); setError(""); }}
                className="w-full text-white/50 hover:text-white/80"
              >
                ← Back to login
              </Button>
            )}
          </form>
        )}

        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Your credentials are sent directly to Instagram's servers via our encrypted backend.
          We do not store your password. Only the session token is saved for API access.
        </p>
      </div>
    </div>
  );
};

export default IGLoginPopup;
