"use client";

export default function ExportProjectButton() {
  return (
    <button
      onClick={() => window.print()}
      className="block w-full text-center bg-slate-600 text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity"
    >
      Export Report
    </button>
  );
}
