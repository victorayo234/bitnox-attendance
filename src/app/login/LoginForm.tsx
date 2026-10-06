"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, ShieldCheck, GraduationCap, UserPlus } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role");
  const role = rawRole === "admin" ? "admin" : "student";
  const nextParam = searchParams.get("next") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isStudent = role === "student";
  const heading = isStudent ? "Student Login" : "Admin Login";
  const switchTargetRole = isStudent ? "admin" : "student";
  const switchText = isStudent
    ? "Are you an administrator? Admin Login"
    : "Are you a student? Student Login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction({ error: null }, formData);
      if (result?.error) {
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center">
        <Link href="/" className="inline-block transition-opacity hover:opacity-85">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox"
            width={160}
            height={40}
            priority
            className="h-9 w-auto object-contain mx-auto"
          />
        </Link>
        <div className="w-10 h-1 bg-accent rounded-full mt-2 shadow-xs" />
      </div>

      {/* Login Card */}
      <Card className="bg-white shadow-xs">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-soft text-primary">
            {isStudent ? (
              <GraduationCap className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
          <CardTitle className="text-xl font-bold text-primary">{heading}</CardTitle>
          <CardDescription className="text-xs">
            {isStudent
              ? "Enter your student credentials to log attendance"
              : "Enter your administrator credentials to access the console"}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="next" value={nextParam} />

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-primary"
              >
                Email Address
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
                  placeholder={isStudent ? "student@bitnox.qc" : "admin@bitnox.qc"}
                  className="w-full rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-primary"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-full border border-border bg-white pl-10 pr-11 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted hover:text-primary focus:outline-none"
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

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isPending}
                className="py-3 text-sm shadow-sm"
              >
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>

          {/* Student-only Sign-up link: NO sign-up link for Admin */}
          {isStudent && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  Sign up
                </Link>
              </p>
            </div>
          )}

          {/* Switch Role Link */}
          <div className="mt-5 border-t border-border pt-4 text-center">
            <Link
              href={`/login?role=${switchTargetRole}${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""}`}
              className="text-xs text-muted hover:text-primary font-medium transition-colors"
            >
              {switchText}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home Link */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
