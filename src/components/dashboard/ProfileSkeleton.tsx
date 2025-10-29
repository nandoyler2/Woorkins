import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      {/* Cover Skeleton */}
      <div className="w-full h-48 md:h-60 bg-muted animate-pulse" />
      
      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-woorkins">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card/30 backdrop-blur-sm border-2 border-primary/10 shadow-xl">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar Skeleton */}
                  <Skeleton className="w-36 h-36 rounded-full -mt-20 flex-shrink-0" />
                  
                  {/* Info Skeleton */}
                  <div className="flex-1 space-y-3 pt-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-4 pt-2">
                      <Skeleton className="h-6 w-32 rounded-full" />
                      <Skeleton className="h-6 w-32 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs Skeleton */}
            <div className="mt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Card key={i} className="bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="space-y-4">
            <Card className="bg-card/30 backdrop-blur-sm border-2">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
