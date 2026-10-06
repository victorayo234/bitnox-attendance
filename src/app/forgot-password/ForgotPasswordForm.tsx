"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OTP_EXPIRY_MINUTES } from "@/lib/config";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role");
  const role = rawRole === "admin" ? "admin" : "student";

  // Flow step state: 1 = email, 2 = code & new password
  const [step, setStep] = useState<1 | 2>(1);

  // Form field states
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timers: code expiry countdown & resend cooldown
  const [codeExpiresSeconds, setCodeExpiresSeconds] = useState(OTP_EXPIRY_MINUTES * 60);
  const [resendCooldown, setResendCooldown] = useState(60);

  // Sign out on unmount so recovery session does not linger if user leaves page
  useEffect(() => {
    return () => {
      const supabase = createClient();
      supabase.auth.signOut();
    };
  }, []);

  // Countdown timer for step 2
  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setCodeExpiresSeconds((prev) => Math.max(prev - 1, 0));
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Format MM:SS for countdown
  const minutes = Math.floor(codeExpiresSeconds / 60);
  const seconds = codeExpiresSeconds % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  const isCodeExpired = codeExpiresSeconds <= 0;

  // Step 1: Request Password Reset Code
  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      // Check if rate limited
      if (
        error &&
        (error.status === 429 ||
          error.message.toLowerCase().includes("rate") ||
          error.message.toLowerCase().includes("too many"))
      ) {
        setErrorMessage("Too many requests. Please wait a minute and try again.");
        setIsSubmitting(false);
        return;
      }

      // Always move to step 2 with identical message to prevent user enumeration
      setEmail(trimmedEmail);
      setStep(2);
      setCodeExpiresSeconds(OTP_EXPIRY_MINUTES * 60);
      setResendCooldown(60);
      setInfoMessage(
        `If an account exists for this email, a 6-digit code has been sent. The code expires in ${OTP_EXPIRY_MINUTES} minutes. Check your spam folder too.`
      );
    } catch {
      // Graceful fallback to prevent email harvesting
      setEmail(trimmedEmail);
      setStep(2);
      setCodeExpiresSeconds(OTP_EXPIRY_MINUTES * 60);
      setResendCooldown(60);
      setInfoMessage(
        `If an account exists for this email, a 6-digit code has been sent. The code expires in ${OTP_EXPIRY_MINUTES} minutes. Check your spam folder too.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2 Resend Code
  async function handleResendCode() {
    if (resendCooldown > 0 || isSubmitting) return;

    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (
        error &&
        (error.status === 429 ||
          error.message.toLowerCase().includes("rate") ||
          error.message.toLowerCase().includes("too many"))
      ) {
        setErrorMessage("Too many requests. Please wait a minute and try again.");
        setIsSubmitting(false);
        return;
      }

      setCodeExpiresSeconds(OTP_EXPIRY_MINUTES * 60);
      setResendCooldown(60);
      setCode("");
      setInfoMessage(
        `A new 6-digit code has been sent. The code expires in ${OTP_EXPIRY_MINUTES} minutes.`
      );
    } catch {
      setErrorMessage("Failed to resend code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2 Submit: Verify Code and Update Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const sanitizedCode = code.trim();
    if (sanitizedCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify both fields.");
      return;
    }

    if (isCodeExpired) {
      setErrorMessage("Code expired. Request a new one.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Verify recovery OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: sanitizedCode,
        type: "recovery",
      });

      if (verifyError) {
        const msg = verifyError.message.toLowerCase();
        if (msg.includes("expired")) {
          setErrorMessage("Code expired. Request a new one.");
        } else {
          setErrorMessage("Invalid code. Please check and try again.");
        }
        setIsSubmitting(false);
        return;
      }

      // 2. Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setErrorMessage("Failed to update password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 3. Immediately sign out to prevent staying logged in
      await supabase.auth.signOut();

      // 4. Redirect to login with green confirmation message
      router.push(
        `/login?role=${role}&message=${encodeURIComponent("Password updated. Please log in.")}`
      );
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center">
        <Link href="/" className="inline-block transition-opacity hover:opacity-85">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox Attendance"
            width={160}
            height={40}
            priority
            className="h-9 w-auto object-contain mx-auto"
          />
        </Link>
        <div className="w-10 h-1 bg-accent rounded-full mt-2 shadow-xs" />
      </div>

      {/* Main Card */}
      <Card className="bg-white shadow-xs">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-soft text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-primary">
            Reset Password
          </CardTitle>
          <CardDescription className="text-xs">
            {step === 1
              ? "Enter your account email to receive a recovery code"
              : "Verify your code and create a new password"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Error Banner */}
          {errorMessage && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-absent/30 bg-absent/10 p-3 text-xs text-absent animate-in fade-in-50"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-tight font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-border bg-[#F1F4FB] p-3 text-xs text-muted animate-in fade-in-50"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p className="leading-relaxed text-[#0B1B3F]">{infoMessage}</p>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-primary"
                >
                  Account Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === "admin" ? "admin@bitnox.qc" : "student@bitnox.qc"
                    }
                    className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                  className="py-3 text-sm shadow-sm"
                >
                  Send Recovery Code
                </Button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter Code & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Header instruction line */}
              <div className="rounded-xl bg-[#F1F4FB] border border-[#DDE3EE] p-3 space-y-1.5">
                <p className="text-xs text-[#0B1B3F] leading-snug">
                  Enter the 6-digit code sent to{" "}
                  <strong className="text-primary font-semibold">{email}</strong>. It expires in{" "}
                  {OTP_EXPIRY_MINUTES} minutes.
                </p>

                {/* Live Countdown & Expired State */}
                <div className="flex items-center justify-between pt-1 border-t border-[#DDE3EE]/60 text-[11px]">
                  <span className="flex items-center gap-1 text-[#5E6C87]">
                    <Clock className="w-3.5 h-3.5" />
                    Status:
                  </span>
                  {isCodeExpired ? (
                    <span className="font-semibold text-red-600">
                      Code expired. Request a new one.
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-700">
                      Code expires in {formattedCountdown}
                    </span>
                  )}
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="code"
                  className="block text-xs font-semibold text-primary"
                >
                  6-Digit Recovery Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="w-full min-h-[44px] rounded-full border border-border bg-white px-4 py-2.5 text-center text-lg font-mono tracking-[0.4em] text-primary placeholder:text-muted/40 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="block text-xs font-semibold text-primary"
                >
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-11 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 w-11 min-h-[44px] flex items-center justify-center text-muted hover:text-primary focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-primary"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-11 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 w-11 min-h-[44px] flex items-center justify-center text-muted hover:text-primary focus:outline-none"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting || isCodeExpired}
                  isLoading={isSubmitting}
                  className="py-3 text-sm shadow-sm"
                >
                  Update Password
                </Button>
              </div>

              {/* Resend Code Button with Cooldown */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-5 border-t border-border pt-4 text-center">
            <Link
              href={`/login?role=${role}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
