import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminStudentsLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 bg-slate-200 rounded" />
          <div className="h-3.5 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-11 w-32 bg-slate-200 rounded-full" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="h-10 max-w-md bg-slate-100 rounded-full" />

      {/* Students Table Skeleton */}
      <Card className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-4">
        <div className="h-4 w-40 bg-slate-200 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-8 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
