import React from "react";
import { Card } from "@/components/ui/Card";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse motion-reduce:animate-none">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-[#DDE3EE] rounded" />
        <div className="h-3.5 w-64 bg-[#DDE3EE]/60 rounded" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[12px] bg-white border border-[#DDE3EE] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
          >
            <div className="space-y-2">
              <div className="h-4 w-36 bg-[#DDE3EE] rounded" />
              <div className="h-3 w-48 bg-[#DDE3EE]/60 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-[#DDE3EE] rounded-lg" />
              <div className="h-8 w-16 bg-[#DDE3EE] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
