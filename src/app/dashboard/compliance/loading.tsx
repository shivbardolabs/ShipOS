export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-800 rounded-lg" />
        <div className="h-10 w-32 bg-surface-800 rounded-lg" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-surface-800 rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-surface-800 rounded-xl" />
    </div>
  );
}
