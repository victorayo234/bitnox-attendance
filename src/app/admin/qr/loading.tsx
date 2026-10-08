import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminQrLoading() {
  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto animate-pulse motion-reduce:animate-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[#DDE3EE] rounded" />
          <div className="h-3 w-72 bg-[#DDE3EE]/60 rounded" />
        </div>
        <div className="h-10 w-36 bg-[#DDE3EE] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-[#DDE3EE] p-6 rounded-[12px] flex flex-col items-center space-y-4 shadow-[0_1px_2px_rgba(11,27,63,0.04)]">
            <div className="h-5 w-28 bg-[#DDE3EE] rounded" />
            <div className="w-64 h-64 bg-[#DDE3EE]/40 rounded-lg" />
            <div className="h-3 w-44 bg-[#DDE3EE]/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
