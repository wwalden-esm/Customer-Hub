export default function HubLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded" />
        ))}
      </div>
      <div className="h-48 bg-slate-200 rounded mb-4" />
      <div className="h-36 bg-slate-200 rounded" />
    </div>
  );
}
