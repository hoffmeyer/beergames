export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-gray-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      <p>{label}</p>
    </div>
  );
}
