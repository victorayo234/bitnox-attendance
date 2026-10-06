"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function getLagosDateString(): string {
  const now = new Date();
  // Africa/Lagos is UTC+1
  const lagosMs = now.getTime() + 60 * 60 * 1000;
  const lagosDate = new Date(lagosMs);
  return lagosDate.toISOString().split("T")[0];
}

/**
 * Client watcher that revalidates student layout state across
 * key attendance time boundaries (midnight rollover, 08:00, 08:30, 12:00 Lagos time),
 * every 60 seconds, and when device wakes from sleep / tab becomes visible.
 * Ensures the page stays 100% correct when left open overnight.
 */
export function StudentBoundaryWatcher() {
  const router = useRouter();
  const mountedDateRef = useRef<string>(getLagosDateString());
  const lastRefreshTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // 1. Periodic refresh every 60 seconds
    const intervalId = setInterval(() => {
      const currentDate = getLagosDateString();
      if (currentDate !== mountedDateRef.current) {
        mountedDateRef.current = currentDate;
      }
      lastRefreshTimeRef.current = Date.now();
      router.refresh();
    }, 60000);

    // 2. Exact boundary calculator for Lagos time (UTC+1)
    // Key moments: 00:00 (midnight rollover), 08:00 (gate open), 08:30 (late threshold), 12:00 (checkout open)
    const computeMsToNextBoundary = () => {
      const now = new Date();
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const lagosMinutes = (utcMinutes + 60) % 1440;

      const boundaryMinutes = [0, 480, 510, 720];
      const futureBoundaries = boundaryMinutes.filter((bm) => bm > lagosMinutes);

      const nextTargetMin =
        futureBoundaries.length > 0
          ? futureBoundaries[0]
          : 1440; // midnight rollover

      const diffMinutes = nextTargetMin - lagosMinutes;
      const msUntilBoundary =
        diffMinutes * 60 * 1000 -
        now.getUTCSeconds() * 1000 -
        now.getUTCMilliseconds();
      return Math.max(msUntilBoundary + 1500, 1000); // 1.5s buffer after boundary
    };

    const msToBoundary = computeMsToNextBoundary();
    const timeoutId = setTimeout(() => {
      mountedDateRef.current = getLagosDateString();
      lastRefreshTimeRef.current = Date.now();
      router.refresh();
    }, msToBoundary);

    // 3. Tab Visibility & Sleep Wakeup Handler (overnight guard)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentDate = getLagosDateString();
        const elapsedSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;

        // If date has crossed over night, or more than 45 seconds have passed since last refresh
        if (currentDate !== mountedDateRef.current || elapsedSinceLastRefresh > 45000) {
          mountedDateRef.current = currentDate;
          lastRefreshTimeRef.current = Date.now();
          router.refresh();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
