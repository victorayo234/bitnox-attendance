import React from "react";
import { Card } from "@/components/ui/Card";

export default function StudentDetailLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse motion-reduce:animate-none">
      {/* Back button skeleton */}
      <div className="h-4 w-36 bg-[#DDE3EE] rounded" />

      {/* Student Profile Card Skeleton */}
      <div className="bg-white border border-[#DDE3EE] p-6 rounded-[12px] flex items-center justify-between shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[#DDE3EE] rounded" />
          <div className="h-3 w-56 bg-[#DDE3EE]/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-[#DDE3EE] rounded-lg" />
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white border border-[#DDE3EE] rounded-[12px] space-y-2 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <div className="h-3 w-20 bg-[#DDE3EE]/60 rounded" />
            <div className="h-6 w-12 bg-[#DDE3EE] rounded" />
          </div>
        ))}
      </div>

      {/* Week Group Skeleton */}
      <div className="bg-white border border-[#DDE3EE] rounded-[12px] p-5 space-y-3 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
        <div className="h-5 w-44 bg-[#DDE3EE] rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3 border-b border-[#DDE3EE]/60 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-24 bg-[#DDE3EE] rounded" />
              <div className="h-3 w-36 bg-[#DDE3EE]/60 rounded" />
            </div>
            <div className="h-6 w-16 bg-[#DDE3EE] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
