import { Suspense } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password | Bitnox Attendance",
  description: "Reset your Bitnox Technology attendance account password",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="w-full max-w-sm mx-auto p-8 text-center text-sm text-[#5E6C87]">
            Loading password recovery...
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
