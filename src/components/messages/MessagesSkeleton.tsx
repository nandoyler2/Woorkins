import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function MessagesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col">
        {/* Navigation filters */}
        <div className="p-4 border-b space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </Card>
    </div>
  );
}
