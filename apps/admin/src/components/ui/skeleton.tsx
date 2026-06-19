export function SkeletonPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="glass-card h-32 animate-pulse p-4">
          <div className="h-9 w-9 rounded-2xl bg-white/10" />
          <div className="mt-5 h-3 w-24 rounded bg-white/10" />
          <div className="mt-3 h-6 w-32 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}
