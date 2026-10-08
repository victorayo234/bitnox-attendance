import React from "react";
import { Card } from "@/components/ui/Card";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-pulse">
      {/* Greeting Header Skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-48 bg-slate-200 rounded-md" />
        <div className="h-4 w-60 bg-slate-100 rounded-md" />
      </div>

      {/* Main Status Card Skeleton */}
      <Card className="bg-white border border-border rounded-[12px] p-6 shadow-[0_1px_2px_rgba(11,27,63,0.04)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="h-5 w-40 bg-slate-200 rounded-md" />
          </div>
          <div className="h-4 w-16 bg-slate-100 rounded-md" />
        </div>

        <div className="h-12 w-full bg-slate-200 rounded-lg" />
      </Card>

      {/* Link Skeleton */}
      <div className="flex justify-center pt-1">
        <div className="h-4 w-28 bg-slate-100 rounded-md" />
      </div>
    </div>
  );
}
