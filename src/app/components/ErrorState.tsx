export function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <p className="text-red-600">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded border border-gray-300 px-4 py-2 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}
