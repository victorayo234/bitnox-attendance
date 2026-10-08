import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <div className="h-7 w-36 bg-slate-200 rounded-md" />
        <div className="h-4 w-28 bg-slate-100 rounded-md" />
      </div>

      {/* Summary Strip (ONE card with 4 segments) */}
      <Card className="bg-white border border-border rounded-[12px] overflow-hidden p-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-5 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[10px] bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-7 w-12 bg-slate-200 rounded" />
                <div className="h-2.5 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 pt-2 border-t border-border/40">
          <div className="h-1.5 w-full bg-slate-100 rounded-full" />
        </div>
      </Card>

      {/* Toolbar row skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="h-9 w-48 bg-slate-100 rounded-lg" />
        <div className="h-9 w-44 bg-slate-100 rounded-lg" />
      </div>

      {/* Filters & Search skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="h-9 w-64 bg-slate-100 rounded-lg" />
        <div className="h-10 w-full sm:w-60 bg-slate-100 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <Card className="bg-white border border-border rounded-[12px] p-0 overflow-hidden">
        <div className="h-10 bg-slate-50 border-b border-border" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-40 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-8 w-20 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
