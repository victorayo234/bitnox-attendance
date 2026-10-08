import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function WeeklyAttendanceLoading() {
  return (
    <div className="space-y-6 pb-24 md:pb-8 animate-pulse motion-reduce:animate-none">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-[#DDE3EE] rounded" />
          <div className="h-3 w-64 bg-[#DDE3EE]/60 rounded" />
        </div>
        <div className="h-8 w-24 bg-[#DDE3EE] rounded-lg" />
      </div>

      {/* Week Navigator Skeleton */}
      <div className="bg-white border border-[#DDE3EE] p-3 rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="flex items-center justify-between">
          <div className="h-9 w-28 bg-[#DDE3EE] rounded-lg" />
          <div className="space-y-1 flex flex-col items-center">
            <div className="h-4 w-36 bg-[#DDE3EE] rounded" />
            <div className="h-2.5 w-20 bg-[#DDE3EE]/60 rounded" />
          </div>
          <div className="h-9 w-28 bg-[#DDE3EE] rounded-lg" />
        </div>
      </div>

      {/* Summary KPI Cards Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3.5 text-center bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] space-y-2">
            <div className="h-7 w-10 bg-[#DDE3EE] rounded mx-auto" />
            <div className="h-3 w-14 bg-[#DDE3EE]/60 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Daily Schedule Skeleton */}
      <div className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden">
        <div className="py-3.5 px-4 sm:px-5 border-b border-[#DDE3EE] bg-[#F1F4FB]/50">
          <div className="h-4 w-44 bg-[#DDE3EE] rounded" />
        </div>

        <div className="p-0 divide-y divide-[#DDE3EE]/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:px-5 flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 bg-[#DDE3EE] rounded" />
                  <div className="h-3 w-12 bg-[#DDE3EE]/60 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-20 bg-[#DDE3EE]/60 rounded" />
                  <div className="h-3 w-20 bg-[#DDE3EE]/60 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-[#DDE3EE] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
