import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components";
import { GraduationCap, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col justify-between px-4 sm:px-6 py-8">
      {/* Top bar (minimal) */}
      <div className="w-full max-w-md mx-auto flex justify-end">
        <span className="text-xs font-medium text-muted bg-soft px-3 py-1 rounded-full border border-border">
          Abeokuta Hub
        </span>
      </div>

      {/* Hero content */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-8 my-auto">
        {/* Logo with cyan accent line */}
        <div className="flex flex-col items-center">
          <Image
            src="/images/bitnox-logo.png"
            alt="Bitnox"
            width={180}
            height={44}
            priority
            className="h-10 w-auto object-contain"
          />
          {/* Cyan accent line under the logo */}
          <div className="w-12 h-1 bg-accent rounded-full mt-2.5 shadow-xs" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Bitnox Attendance
          </h1>
          <p className="text-sm sm:text-base text-muted font-normal">
            Scan in. Scan out. Stay on track.
          </p>
        </div>

        {/* Two large pill buttons */}
        <div className="w-full space-y-3.5 pt-2">
          <Link href="/login?role=student" className="block w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<GraduationCap className="w-5 h-5 text-white/90" />}
              className="text-base py-3.5 shadow-sm"
            >
              Student Login
            </Button>
          </Link>

          <Link href="/login?role=admin" className="block w-full">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              leftIcon={<ShieldCheck className="w-5 h-5 text-primary" />}
              className="text-base py-3.5"
            >
              Admin Login
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer minimal */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-muted pt-6">
        <p>© {new Date().getFullYear()} Bitnox Technology. All rights reserved.</p>
      </footer>
    </main>
  );
}
