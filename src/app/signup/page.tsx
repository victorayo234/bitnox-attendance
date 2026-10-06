import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Student Enrollment | Bitnox Attendance",
  description: "Register for Bitnox Technology attendance tracking",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="w-full max-w-sm mx-auto p-8 text-center text-sm text-muted">
            Loading enrollment portal...
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
