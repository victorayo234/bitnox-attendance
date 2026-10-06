import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border border-[#DDE3EE] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-full bg-slate-100" />
            </div>
            <div className="h-8 w-14 bg-slate-200 rounded" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Date Picker Header Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] p-4 rounded-2xl flex items-center justify-between">
        <div className="h-9 w-44 bg-slate-100 rounded-full" />
        <div className="h-9 w-28 bg-slate-100 rounded-full" />
      </Card>

      {/* Table Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-100 rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-44 bg-slate-100 rounded" />
            </div>
            <div className="h-7 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
