export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <div className="max-w-7xl mx-auto px-6 py-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
