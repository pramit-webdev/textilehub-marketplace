export function Spinner({ className = "h-8 w-8" }) {
  return (
    <div className="flex w-full items-center justify-center py-10">
      <div className={`${className} animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-700`} />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
    </div>
  );
}

export function EmptyState({ icon = "🧺", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white py-16 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-stone-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
