import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminWeeklyLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Week Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded" />
          <div className="h-3.5 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-11 w-64 bg-slate-100 rounded-full" />
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border border-[#DDE3EE] p-4 rounded-2xl space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
            <div className="h-2.5 w-20 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Matrix Table Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-3">
        <div className="h-5 w-44 bg-slate-200 rounded" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="w-7 h-7 bg-slate-100 rounded-lg" />
              ))}
            </div>
            <div className="h-6 w-14 bg-slate-100 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
