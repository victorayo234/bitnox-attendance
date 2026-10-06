import React from "react";
import { Card } from "@/components/ui/Card";

export default function StudentDetailLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-36 bg-slate-100 rounded" />

      {/* Student Profile Card Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] p-6 rounded-2xl flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-100 rounded-full" />
      </Card>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-white border border-[#DDE3EE] rounded-2xl space-y-2">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-12 bg-slate-200 rounded" />
          </Card>
        ))}
      </div>

      {/* Week Group Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-3">
        <div className="h-5 w-44 bg-slate-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3 border-b border-slate-50 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-16 bg-slate-100 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
