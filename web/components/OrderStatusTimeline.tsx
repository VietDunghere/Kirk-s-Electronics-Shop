"use client";
import { ORDER_STATUSES } from "@/lib/utils";

export default function OrderStatusTimeline({ status }: { status: string }) {
  const idx = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);
  const current = idx === -1 ? 0 : idx;
  return (
    <div className="w-full">
      <div className="flex items-center">
        {ORDER_STATUSES.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  i <= current ? "bg-[#0A3161] text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span className={`mt-1 hidden text-center text-[11px] font-medium sm:block ${i <= current ? "text-[#0A3161]" : "text-gray-400"}`}>
                {s}
              </span>
            </div>
            {i < ORDER_STATUSES.length - 1 && (
              <div className={`mx-1 h-1 flex-1 rounded ${i < current ? "bg-[#0A3161]" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-[#0A3161] sm:hidden">Current: {ORDER_STATUSES[current]}</p>
    </div>
  );
}
