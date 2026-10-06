import React from "react";
import { Card } from "@/components/ui/Card";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-slate-200 rounded" />
        <div className="h-3.5 w-64 bg-slate-100 rounded" />
      </div>

      <Card className="bg-white border border-[#DDE3EE] rounded-2xl p-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-3 border-b border-slate-50 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-slate-100 rounded-full" />
              <div className="h-8 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
