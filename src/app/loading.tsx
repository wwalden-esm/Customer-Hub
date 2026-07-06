export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-esm-grey-light">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold animate-pulse">
          ESM
        </div>
        <span className="text-sm text-esm-grey">Loading...</span>
      </div>
    </div>
  );
}
