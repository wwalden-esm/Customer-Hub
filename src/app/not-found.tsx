import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-esm-grey-light flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-esm-red rounded flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">
          ESM
        </div>
        <h1 className="text-4xl font-bold text-esm-black mb-2">404</h1>
        <p className="text-esm-grey mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-esm-red rounded hover:opacity-90 transition-opacity">
            ESM Dashboard
          </Link>
          <Link href="/hub" className="px-4 py-2 text-sm font-medium text-esm-black border border-esm-border rounded hover:bg-slate-50 transition-colors">
            Customer Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
