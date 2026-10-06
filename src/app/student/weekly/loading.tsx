import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function WeeklyAttendanceLoading() {
  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-md" />
          <div className="h-3 w-64 bg-slate-100 rounded-md" />
        </div>
        <div className="h-8 w-24 bg-slate-100 rounded-full" />
      </div>

      {/* Week Navigator Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-11 w-32 bg-slate-100 rounded-full" />
          <div className="space-y-1 flex flex-col items-center">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-2.5 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-11 w-28 bg-slate-100 rounded-full" />
        </div>
      </Card>

      {/* Summary KPI Cards Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3.5 text-center bg-slate-50 border-slate-200 shadow-xs space-y-2">
            <div className="h-7 w-10 bg-slate-200 rounded mx-auto" />
            <div className="h-3 w-14 bg-slate-100 rounded mx-auto" />
          </Card>
        ))}
      </div>

      {/* Daily Schedule Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] shadow-sm overflow-hidden">
        <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-[#DDE3EE]/60 bg-[#FAFCFF]">
          <div className="h-4 w-44 bg-slate-200 rounded" />
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#DDE3EE]/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:px-5 flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-3 w-12 bg-slate-100 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
