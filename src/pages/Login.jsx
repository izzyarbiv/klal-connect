import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import VerifyEmail from "@/components/VerifyEmail";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set when the account registered but never entered its email code; the
  // server has just sent a fresh one.
  const [verify, setVerify] = useState(null);
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();
  const reasonReport = new URLSearchParams(window.location.search).get("reason") === "report";
  const registerParams = new URLSearchParams();
  if (returnTo !== "/") registerParams.set("returnTo", returnTo);
  if (reasonReport) registerParams.set("reason", "report");
  const registerLink = "/register" + (registerParams.toString() ? "?" + registerParams.toString() : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      if (err.data?.verification_required) { setVerify({ email, devCode: err.data.dev_code }); return; }
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // An account that registered but never entered its code has not seen the
  // welcome cards either; verifying here sends it there first.
  const afterVerify = (result) => {
    const onboarded = !!result?.user?.onboarded;
    window.location.href = onboarded ? returnTo : '/welcome' + (returnTo !== '/' && returnTo !== '/welcome' ? '?returnTo=' + encodeURIComponent(returnTo) : '');
  };
  if (verify) return <VerifyEmail email={verify.email} devCode={verify.devCode} onVerified={afterVerify} />;

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={registerLink}
            className="text-primary font-medium hover:underline"
          >
          Create one
          </Link>
        </>
      }
    >
      {reasonReport && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 text-primary text-sm">
          Please log in to report an issue. Reports are private, but we require an account so our review team can follow up if needed.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}