"use client";

import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import { Camera, CameraOff, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface QrScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

type ScannerStatus =
  | "IDLE"
  | "REQUESTING_CAMERA"
  | "ACTIVE"
  | "SCANNED"
  | "PERMISSION_DENIED"
  | "NO_CAMERA"
  | "ERROR";

export function QrScanner({
  onScan,
  disabled = false,
  helperText = "Align the QR code within the frame to scan",
  className = "",
}: QrScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>("REQUESTING_CAMERA");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate unique container ID to avoid collision
  const reactId = useId().replace(/:/g, "_");
  const containerId = `qr_viewfinder_${reactId}`;

  // Refs for tracking lifecycle safely across React Strict Mode double-invocations
  const scannerInstanceRef = useRef<any>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const pendingStopRef = useRef<boolean>(false);
  const hasScannedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      const scanner = scannerInstanceRef.current;
      if (scanner) {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        try {
          scanner.clear();
        } catch {
          // Ignore clear errors if DOM already modified
        }
      }
    } catch (err) {
      console.warn("[QrScanner] Error stopping camera stream:", err);
    } finally {
      scannerInstanceRef.current = null;
      isStoppingRef.current = false;
    }
  }, []);

  // Start camera helper
  const startCamera = useCallback(async () => {
    if (disabled || !isMountedRef.current) {
      setStatus("IDLE");
      return;
    }

    if (isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;
    pendingStopRef.current = false;
    hasScannedRef.current = false;
    setStatus("REQUESTING_CAMERA");
    setErrorMessage(null);

    // Stop any existing stream first
    await stopCamera();

    try {
      // Dynamic import to prevent SSR execution
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!isMountedRef.current || pendingStopRef.current) {
        isStartingRef.current = false;
        return;
      }

      // Check if target container exists in DOM
      const element = document.getElementById(containerId);
      if (!element) {
        throw new Error("Scanner DOM container not found");
      }

      const html5QrCode = new Html5Qrcode(containerId);
      scannerInstanceRef.current = html5QrCode;

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.72);
          return {
            width: Math.max(boxSize, 180),
            height: Math.max(boxSize, 180),
          };
        },
        aspectRatio: 1.0,
      };

      const handleScanSuccess = async (decodedText: string) => {
        // Prevent duplicate submits
        if (hasScannedRef.current || !isMountedRef.current) return;
        hasScannedRef.current = true;

        // Stop camera immediately
        await stopCamera();

        if (isMountedRef.current) {
          setStatus("SCANNED");
          onScan(decodedText);
        }
      };

      const handleScanFailure = () => {
        // Frame-level scan progress, ignore standard non-detection events
      };

      // 1. Attempt rear camera with facingMode: environment
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          qrConfig,
          handleScanSuccess,
          handleScanFailure
        );
      } catch (firstErr) {
        // 2. Fallback to enumerated cameras (useful for devices without standard facingMode)
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        if (cameras && cameras.length > 0) {
          const rearCamera = cameras.find((cam) =>
            /back|rear|environment/i.test(cam.label)
          );
          const selectedCameraId = rearCamera ? rearCamera.id : cameras[0].id;

          await html5QrCode.start(
            selectedCameraId,
            qrConfig,
            handleScanSuccess,
            handleScanFailure
          );
        } else {
          throw firstErr;
        }
      }

      // Handle unmount or stop request that arrived while starting
      if (pendingStopRef.current || !isMountedRef.current) {
        await stopCamera();
        return;
      }

      if (isMountedRef.current) {
        setStatus("ACTIVE");
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const errorStr = (err?.message || String(err)).toLowerCase();
      const errorName = err?.name || "";

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        errorStr.includes("permission") ||
        errorStr.includes("notallowederror")
      ) {
        setStatus("PERMISSION_DENIED");
      } else if (
        errorName === "NotFoundError" ||
        errorName === "DevicesNotFoundError" ||
        errorStr.includes("notfounderror") ||
        errorStr.includes("requested device not found") ||
        errorStr.includes("no camera")
      ) {
        setStatus("NO_CAMERA");
      } else {
        setStatus("ERROR");
        setErrorMessage(
          err?.message || "Failed to initialize camera. Please try again."
        );
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [containerId, disabled, onScan, stopCamera]);

  // Restart camera (used by "Try again" / "Scan again")
  const restartCamera = useCallback(() => {
    hasScannedRef.current = false;
    startCamera();
  }, [startCamera]);

  // Mount/Unmount lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    if (!disabled) {
      startCamera();
    } else {
      setStatus("IDLE");
    }

    return () => {
      isMountedRef.current = false;
      pendingStopRef.current = true;
      stopCamera();
    };
  }, [disabled, startCamera, stopCamera]);

  return (
    <div className={`w-full max-w-sm mx-auto flex flex-col items-center ${className}`}>
      {/* Viewfinder Outer Frame */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#0B1B3F] border border-[#DDE3EE] shadow-md flex items-center justify-center">
        {/* html5-qrcode video mount target */}
        <div
          id={containerId}
          className="qr-video-container w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden"
        />

        {/* ACTIVE: Live Scanning Reticle Overlay */}
        {status === "ACTIVE" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
            {/* Darkened vignette around target */}
            <div className="relative w-60 h-60 max-w-[80%] max-h-[80%] rounded-2xl border border-white/20">
              {/* Cyan corner accents */}
              <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#00E6FF] rounded-tl-xl" />
              <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#00E6FF] rounded-tr-xl" />
              <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#00E6FF] rounded-bl-xl" />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#00E6FF] rounded-br-xl" />

              {/* Animated cyan scan line */}
              <div className="animate-scan-line left-2 right-2 h-0.5 bg-[#00E6FF] shadow-[0_0_10px_#00E6FF]" />
            </div>
          </div>
        )}

        {/* REQUESTING_CAMERA: Loading State */}
        {status === "REQUESTING_CAMERA" && (
          <div className="absolute inset-0 bg-[#0B1B3F] text-white flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-3 animate-pulse">
              <Camera className="w-7 h-7 text-[#00E6FF]" />
            </div>
            <p className="font-semibold text-base text-white">Requesting camera...</p>
            <p className="text-xs text-white/70 mt-1 max-w-[220px]">
              Please allow camera permissions if prompted by your browser.
            </p>
          </div>
        )}

        {/* PERMISSION_DENIED: Clear Message with Steps */}
        {status === "PERMISSION_DENIED" && (
          <div className="absolute inset-0 bg-white text-[#0B1B3F] flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <CameraOff className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[#0B1B3F]">Camera Permission Denied</h4>
            <div className="text-xs text-[#5E6C87] text-left mt-2.5 space-y-1.5 bg-[#F1F4FB] p-3 rounded-xl border border-[#DDE3EE]">
              <p className="font-medium text-[#0B1B3F]">To enable your camera:</p>
              <p>1. Tap the lock or tune icon in the address bar.</p>
              <p>2. Set Camera access to <strong>Allow</strong>.</p>
              <p>3. Tap <strong>Try Again</strong> below or reload.</p>
            </div>
            <Button
              size="sm"
              className="mt-4"
              onClick={restartCamera}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          </div>
        )}

        {/* NO_CAMERA: No Camera Found State */}
        {status === "NO_CAMERA" && (
          <div className="absolute inset-0 bg-white text-[#0B1B3F] flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[#0B1B3F]">No Camera Found</h4>
            <p className="text-xs text-[#5E6C87] mt-1.5 max-w-[220px]">
              We couldn&apos;t detect a rear or video camera on this device.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={restartCamera}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          </div>
        )}

        {/* ERROR: Generic Error State */}
        {status === "ERROR" && (
          <div className="absolute inset-0 bg-white text-[#0B1B3F] flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[#0B1B3F]">Camera Unavailable</h4>
            <p className="text-xs text-[#5E6C87] mt-1 max-w-[220px]">
              {errorMessage || "Unable to start video preview."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={restartCamera}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          </div>
        )}

        {/* SCANNED: Success State with Scan Again Action */}
        {status === "SCANNED" && (
          <div className="absolute inset-0 bg-[#0B1B3F]/95 text-white flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="font-semibold text-base text-white">QR Code Captured</p>
            <p className="text-xs text-white/70 mt-1">Processing attendance record...</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 text-white border-white/30 hover:bg-white/10"
              onClick={restartCamera}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Scan again
            </Button>
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-sm text-[#5E6C87] text-center mt-3 font-normal">
        {helperText}
      </p>

      {/* Mandatory Admin Fallback Note */}
      <p className="text-xs text-[#5E6C87]/80 text-center mt-1.5">
        Camera not working? Ask the admin to mark your attendance.
      </p>
    </div>
  );
}
