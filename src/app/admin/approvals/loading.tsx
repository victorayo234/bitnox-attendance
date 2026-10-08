import React from "react";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6 pb-20 animate-pulse motion-reduce:animate-none">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-[#DDE3EE] rounded" />
        <div className="h-3.5 w-64 bg-[#DDE3EE]/60 rounded" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="bg-[#F1F4FB] p-1 rounded-lg border border-[#DDE3EE] inline-flex items-center gap-1">
          <div className="h-7 w-24 bg-[#DDE3EE] rounded-md" />
          <div className="h-7 w-24 bg-[#DDE3EE]/60 rounded-md" />
          <div className="h-7 w-20 bg-[#DDE3EE]/60 rounded-md" />
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[12px] bg-white border border-[#DDE3EE] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#DDE3EE] shrink-0" />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 bg-[#DDE3EE] rounded" />
                  <div className="h-4 w-14 bg-[#DDE3EE]/60 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-40 bg-[#DDE3EE]/60 rounded" />
                  <div className="h-3 w-28 bg-[#DDE3EE]/60 rounded" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#DDE3EE]/60 sm:border-0">
              <div className="flex-1 sm:flex-initial h-[44px] sm:h-9 w-20 bg-[#DDE3EE]/60 rounded-lg" />
              <div className="flex-1 sm:flex-initial h-[44px] sm:h-9 w-20 bg-[#DDE3EE] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

