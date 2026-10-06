import React from "react";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminQrPrintView } from "@/components/AdminQrPrintView";

export const metadata = {
  title: "QR Codes | Bitnox Attendance",
  description: "Printable static check-in and check-out QR codes generated from server secrets",
};

export default async function AdminQrPage() {
  // 1. Guard server-side with requireAdmin()
  const adminAuth = await requireAdmin();
  if (!adminAuth) {
    redirect("/login?role=admin");
  }

  // 2. Load secrets exclusively on server
  const inSecret = process.env.QR_IN_SECRET || "";
  const outSecret = process.env.QR_OUT_SECRET || "";

  // 3. Generate QR codes in memory at request time (high error correction, 1024px, static black on white)
  // SECURITY: Secrets are NEVER sent as text or props to the browser; only the generated data URL images are sent.
  let inQrDataUrl = "";
  let outQrDataUrl = "";

  if (inSecret) {
    inQrDataUrl = await QRCode.toDataURL(inSecret, {
      errorCorrectionLevel: "H",
      width: 1024,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  }

  if (outSecret) {
    outQrDataUrl = await QRCode.toDataURL(outSecret, {
      errorCorrectionLevel: "H",
      width: 1024,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  }

  return <AdminQrPrintView inQrCode={inQrDataUrl} outQrCode={outQrDataUrl} />;
}
