export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-esm-grey-light">
      <header className="bg-white border-b border-[#E2E0E1]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
              ESM
            </div>
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded" />
      </div>
    </main>
  );
}
