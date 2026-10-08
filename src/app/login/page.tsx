import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Login | Bitnox Attendance",
  description: "Sign in to Bitnox Attendance Portal",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F5F8FE] flex flex-col justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="w-full max-w-sm mx-auto p-8 text-center text-sm text-muted">
            Loading login portal...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
