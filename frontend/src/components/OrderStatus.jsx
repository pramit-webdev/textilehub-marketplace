const STATUS_META = {
  pending: { label: "Pending", dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 ring-amber-200" },
  accepted: { label: "Accepted", dot: "bg-sky-500", bg: "bg-sky-50 text-sky-700 ring-sky-200" },
  preparing: { label: "Preparing", dot: "bg-violet-500", bg: "bg-violet-50 text-violet-700 ring-violet-200" },
  ready_for_dispatch: { label: "Ready for Dispatch", dot: "bg-indigo-500", bg: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  completed: { label: "Completed", dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "Cancelled", dot: "bg-red-500", bg: "bg-red-50 text-red-700 ring-red-200" },
};

export const ORDER_STEPS = ["pending", "accepted", "preparing", "ready_for_dispatch", "completed"];

export function OrderStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, dot: "bg-stone-400", bg: "bg-stone-100 text-stone-600 ring-stone-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function OrderStatusTracker({ status }) {
  const idx = ORDER_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= idx;
        const label = STATUS_META[step].label;
        return (
          <div key={step} className={`flex items-center ${i < ORDER_STEPS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-brand-700 text-white" : "bg-stone-200 text-stone-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className="mt-1 hidden whitespace-nowrap text-[9px] font-medium text-stone-500 sm:block">{label}</span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div className={`mx-1 mb-4 h-0.5 flex-1 sm:mb-5 ${i < idx ? "bg-brand-600" : "bg-stone-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default STATUS_META;
