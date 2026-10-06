import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-pulse">
      {/* Greeting Header Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-200 rounded-md" />
        <div className="h-3.5 w-64 bg-slate-100 rounded-md" />
      </div>

      {/* Main Today Attendance Card Skeleton */}
      <Card className="bg-white overflow-hidden shadow-sm border border-[#DDE3EE]">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#DDE3EE]/60">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          <div className="rounded-xl bg-[#F8FAFE] border border-[#DDE3EE] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
            </div>
            <div className="h-5 w-36 bg-slate-200 rounded mt-1" />
          </div>

          <div className="h-11 w-full bg-slate-200 rounded-full" />
        </CardContent>
      </Card>

      {/* Weekly History Link Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-56 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="w-5 h-5 rounded bg-slate-100" />
      </Card>
    </div>
  );
}
