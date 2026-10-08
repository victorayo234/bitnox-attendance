import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminStudentsLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="h-7 w-32 bg-slate-200 rounded-md" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Filter Chips & Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="h-9 w-64 bg-slate-100 rounded-lg" />
        <div className="h-10 w-full sm:w-60 bg-slate-100 rounded-lg" />
      </div>

      {/* Students Table Skeleton */}
      <Card className="bg-white border border-border rounded-[12px] p-0 overflow-hidden">
        <div className="h-10 bg-slate-50 border-b border-border" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
