"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { signupStudentAction } from "@/lib/actions/auth";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, AlertCircle, Clock, GraduationCap } from "lucide-react";

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await signupStudentAction({ error: null }, formData);
      if (result?.error) {
        setErrorMessage(result.error);
      } else if (result?.success) {
        setIsSubmitted(true);
        form.reset();
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
            alt="Bitnox Attendance"
            width={160}
            height={40}
            priority
            className="h-9 w-auto object-contain mx-auto"
          />
        </Link>
        <div className="w-10 h-1 bg-accent rounded-full mt-2 shadow-xs" />
      </div>

      <Card className="bg-white shadow-xs">
        {/* Waiting for approval screen */}
        {isSubmitted ? (
          <CardContent className="pt-6 pb-6 text-center space-y-5 animate-in fade-in-50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F59E0B]/10 text-late border border-[#F59E0B]/20">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-primary">
                Waiting for approval
              </h2>
              <p className="text-xs text-muted leading-relaxed px-2">
                Your student enrollment has been submitted. An administrator must approve your account before you can log in, access the dashboard, or scan attendance.
              </p>
            </div>

            <div className="rounded-xl bg-soft border border-border p-3 text-xs text-muted">
              <span>Status: </span>
              <span className="font-semibold text-late">Pending Admin Review</span>
            </div>

            <div className="pt-2">
              <Link href="/login?role=student" className="block w-full">
                <Button variant="primary" size="lg" fullWidth className="py-3 text-sm">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-soft text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-primary">Student Sign Up</CardTitle>
              <CardDescription className="text-xs">
                Create your account to record attendance at Bitnox Technology
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {errorMessage && (
                <div
                  className="mb-4 flex items-start gap-2.5 rounded-xl border border-absent/30 bg-absent/10 p-3 text-xs text-absent animate-in fade-in-50"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-tight font-medium">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-primary"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="e.g. Samuel Adeleke"
                      className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Email Address */}
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
                      placeholder="student@bitnox.qc"
                      className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Password (min 8 chars) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-primary"
                  >
                    Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
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
                    Confirm Password
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
                      placeholder="••••••••"
                      className="w-full min-h-[44px] rounded-full border border-border bg-white pl-10 pr-11 py-2.5 text-sm text-primary placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 w-11 min-h-[44px] flex items-center justify-center text-muted hover:text-primary focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
                    isLoading={isPending}
                    className="py-3 text-sm shadow-sm"
                  >
                    {isPending ? "Creating Account..." : "Register as Student"}
                  </Button>
                </div>
              </form>

              {/* Already have an account */}
              <div className="mt-5 border-t border-border pt-4 text-center">
                <p className="text-xs text-muted">
                  Already have an account?{" "}
                  <Link
                    href="/login?role=student"
                    className="font-semibold text-primary hover:underline"
                  >
                    Student Login
                  </Link>
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Back to Home */}
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
