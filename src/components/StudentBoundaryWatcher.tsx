"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lightweight client watcher that revalidates student layout state across
 * key attendance time boundaries (08:00, 12:00 Lagos time) and every 60 seconds.
 */
export function StudentBoundaryWatcher() {
  const router = useRouter();

  useEffect(() => {
    // 1. Periodic refresh every 60 seconds
    const intervalId = setInterval(() => {
      router.refresh();
    }, 60000);

    // 2. Exact boundary calculator for Lagos time (UTC+1)
    const computeMsToNextBoundary = () => {
      const now = new Date();
      // Lagos time in minutes from midnight (UTC+1)
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const lagosMinutes = (utcMinutes + 60) % 1440;

      const boundaryMinutes = [480, 720]; // 08:00 (480) and 12:00 (720)
      const futureBoundaries = boundaryMinutes.filter((bm) => bm > lagosMinutes);

      const nextTargetMin = futureBoundaries.length > 0
        ? futureBoundaries[0]
        : boundaryMinutes[0] + 1440; // tomorrow at 08:00

      const diffMinutes = nextTargetMin - lagosMinutes;
      const msUntilBoundary = diffMinutes * 60 * 1000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds();
      return Math.max(msUntilBoundary + 1000, 1000); // 1s buffer after boundary
    };

    const msToBoundary = computeMsToNextBoundary();
    const timeoutId = setTimeout(() => {
      router.refresh();
    }, msToBoundary);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [router]);

  return null;
}
