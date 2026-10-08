import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components";
import { GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F5F8FE] flex flex-col justify-between px-4 sm:px-6 py-12">
      {/* Top spacing */}
      <div className="w-full max-w-sm mx-auto" />

      {/* Hero content */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-8 my-auto">
        {/* Brand Logo without underline */}
        <div className="flex flex-col items-center">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox Attendance"
            width={180}
            height={44}
            priority
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Headings */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary leading-tight">
            Bitnox Attendance
          </h1>
          <p className="text-xs text-muted font-normal">
            Abeokuta Hub
          </p>
          <p className="text-sm text-muted pt-2">
            Check in and out at the hub.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full pt-2">
          <Link href="/login?role=student" className="block w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<GraduationCap className="w-5 h-5 text-white/90" />}
            >
              Student Login
            </Button>
          </Link>

          {/* Text-style secondary link with a clear gap */}
          <div className="pt-5">
            <Link
              href="/login?role=admin"
              className="text-sm font-medium text-muted hover:text-primary transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="w-full max-w-sm mx-auto text-center text-xs text-muted pt-6">
        <p>© {new Date().getFullYear()} Bitnox Technology. All rights reserved.</p>
      </footer>
    </main>
  );
}
