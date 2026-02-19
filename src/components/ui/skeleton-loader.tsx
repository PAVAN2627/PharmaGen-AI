import { Skeleton } from './skeleton';

export const StatCardSkeleton = () => (
  <div className="glass-card flex items-center gap-4 p-4">
    <Skeleton className="h-10 w-10 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-16" />
    </div>
  </div>
);

export const TableSkeleton = () => (
  <div className="glass-card overflow-hidden">
    <div className="border-b border-border p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
    </div>
    <div className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="glass-card p-6">
    <Skeleton className="mb-4 h-6 w-40" />
    <Skeleton className="h-64 w-full" />
  </div>
);
