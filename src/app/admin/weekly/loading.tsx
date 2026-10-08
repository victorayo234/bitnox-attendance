import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminWeeklyLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Title & Subtitle + Nav Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="h-7 w-44 bg-slate-200 rounded-md" />
          <div className="h-4 w-56 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-52 bg-slate-100 rounded-lg" />
      </div>

      {/* 4 Horizontal Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border border-border rounded-[12px] p-4 flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-16 bg-slate-100 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
            </div>
            <div className="w-12 h-10 bg-slate-100 rounded" />
          </Card>
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <div className="h-10 w-full sm:w-80 bg-slate-100 rounded-lg" />

      {/* Matrix Table Skeleton */}
      <Card className="bg-white border border-border rounded-[12px] p-0 overflow-hidden">
        <div className="h-10 bg-slate-50 border-b border-border" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
            <div className="space-y-1">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-44 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="w-8 h-8 rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
