import Image from "next/image";
import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components";
import { QrCode, ShieldCheck, GraduationCap, MapPin, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/bitnox-logo.png"
              alt="Bitnox Technology"
              width={140}
              height={35}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" withDot>
              Abeokuta Campus
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md mx-auto space-y-8 text-center">
          {/* Logo & Headline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-soft border border-border text-xs font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Bitnox Attendance Portal
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
              Welcome to Bitnox
            </h1>
            <p className="text-sm sm:text-base text-muted max-w-sm mx-auto leading-relaxed">
              Fast, secure QR-based attendance tracking for students and staff at Bitnox Technology.
            </p>
          </div>

          {/* Action Card */}
          <Card className="text-left bg-white shadow-xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Portal Sign In</CardTitle>
                <div className="flex gap-1.5">
                  <Badge variant="present" withDot>
                    Live
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Select your role to access your dashboard and scan attendance.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5 pt-5">
              <Link href="/login?role=student" className="block w-full">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<GraduationCap className="w-5 h-5" />}
                >
                  Student Login
                </Button>
              </Link>

              <Link href="/login?role=admin" className="block w-full">
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  leftIcon={<ShieldCheck className="w-5 h-5" />}
                >
                  Admin Login
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Info Badges / Tokens Demo */}
          <div className="p-4 rounded-[16px] bg-soft border border-border flex items-center justify-around text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>Gate: 08:00 AM</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-primary" />
              <span>QR In / Out</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Africa/Lagos</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-footer py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} Bitnox Technology. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Tech Hub • Abeokuta, Nigeria</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
