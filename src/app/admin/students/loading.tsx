import React from "react";
import { Card } from "@/components/ui/Card";

export default function AdminStudentsLoading() {
  return (
    <div className="w-full">
      {/* Container breakout style for 1200px and above: max-w-7xl with 24px side padding, perfectly centered */}
      <style>{`
        @media (min-width: 1200px) {
          .students-page-container {
            width: min(calc(100vw - 48px), 80rem) !important;
            max-width: 80rem !important;
            margin-left: calc((100% - min(calc(100vw - 48px), 80rem)) / 2) !important;
            margin-right: calc((100% - min(calc(100vw - 48px), 80rem)) / 2) !important;
          }
        }
      `}</style>

      <div className="students-page-container w-full space-y-6 pb-20 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="h-7 w-32 bg-slate-200 rounded-md" />
            <div className="h-4 w-72 bg-slate-100 rounded-md" />
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-lg self-start sm:self-auto" />
        </div>

        {/* Filter Chips & Search Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-64 bg-slate-100 rounded-lg" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-full sm:w-[320px] bg-slate-100 rounded-lg" />
        </div>

        {/* Desktop Table Skeleton (1200px and above) */}
        <Card className="bg-white border border-[#DDE3EE] rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] overflow-hidden hidden min-[1200px]:block">
          <table className="w-full table-fixed text-left text-sm border-collapse">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "43%", minWidth: "460px" }} />
            </colgroup>
            <thead className="bg-[#FAFCFF] border-b border-[#DDE3EE]">
              <tr className="h-[48px]">
                <th className="py-3 px-5"><div className="h-3.5 w-16 bg-slate-200 rounded" /></th>
                <th className="py-3 px-2.5"><div className="h-3.5 w-12 bg-slate-200 rounded" /></th>
                <th className="py-3 px-2.5"><div className="h-3.5 w-14 bg-slate-200 rounded" /></th>
                <th className="py-3 px-2.5"><div className="h-3.5 w-12 bg-slate-200 rounded" /></th>
                <th className="py-3 pr-5 pl-2 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3EE]/60">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="h-[76px]">
                  {/* Account */}
                  <td className="py-4 px-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                        <div className="h-3 w-44 bg-slate-100 rounded" />
                        <div className="h-2.5 w-20 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="py-4 px-2.5 align-middle">
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  </td>
                  {/* Status */}
                  <td className="py-4 px-2.5 align-middle">
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                  </td>
                  {/* Today */}
                  <td className="py-4 px-2.5 align-middle">
                    <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  </td>
                  {/* Actions 4-slot grid */}
                  <td className="py-4 pr-5 pl-2 align-middle text-right">
                    <div
                      className="grid items-center justify-end"
                      style={{
                        gridTemplateColumns: "88px 128px 108px 112px",
                        columnGap: "8px",
                        justifyContent: "end",
                      }}
                    >
                      <div className="h-[36px] w-[88px] bg-slate-100 rounded-lg" />
                      <div className="h-[36px] w-[128px] bg-slate-100 rounded-lg" />
                      <div className="h-[36px] w-[108px] bg-slate-100 rounded-lg" />
                      <div className="h-[36px] w-[112px] bg-slate-100 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Mobile / Tablet Cards Skeleton (Below 1200px) */}
        <div className="min-[1200px]:hidden space-y-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-white border border-[#DDE3EE] p-4 sm:p-5 rounded-[12px] shadow-[0_1px_2px_rgba(11,27,63,0.04)] space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-3 w-40 bg-slate-100 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-6 w-16 bg-slate-100 rounded-full" />
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="border-t border-[#DDE3EE] pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-[44px] bg-slate-100 rounded-lg" />
                  <div className="h-[44px] bg-slate-100 rounded-lg" />
                  <div className="h-[44px] bg-slate-100 rounded-lg" />
                  <div className="h-[44px] bg-slate-100 rounded-lg" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Activity Card Skeleton */}
        <Card className="bg-white border border-[#DDE3EE] rounded-[12px] p-4">
          <div className="h-5 w-36 bg-slate-100 rounded" />
        </Card>
      </div>
    </div>
  );
}
