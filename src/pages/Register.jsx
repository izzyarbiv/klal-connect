import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import VerifyEmail from "@/components/VerifyEmail";
import { safeReturnTo } from "@/lib/authReturnTo";

// A new account goes through the welcome cards first, then on to wherever
// it was headed.
const welcomeUrl = () => { const rt = safeReturnTo(); return '/welcome' + (rt !== '/' && rt !== '/welcome' ? '?returnTo=' + encodeURIComponent(rt) : ''); };

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set once the server has emailed a verification code; null until then, and
  // never when the server signed the account in directly.
  const [verify, setVerify] = useState(null);
  const reasonReport = new URLSearchParams(window.location.search).get("reason") === "report";
  const loginLink = (() => { const p = new URLSearchParams(); const rt = safeReturnTo(); if (rt !== "/") p.set("returnTo", rt); if (reasonReport) p.set("reason", "report"); return "/login" + (p.toString() ? "?" + p.toString() : ""); })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await api.auth.register({ email, password });
      if (result?.access_token) { window.location.href = welcomeUrl(); return; }
      setVerify({ email, devCode: result?.dev_code });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (verify) return <VerifyEmail email={verify.email} devCode={verify.devCode} onVerified={() => { window.location.href = welcomeUrl(); }} />;

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={loginLink}
            className="text-primary font-medium hover:underline"
          >
            Log in
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}