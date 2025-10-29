import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function LoadingMyProjectsSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-woorkins">
        <Skeleton className="h-10 w-64 mb-8" />
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="proposals">Propostas Recebidas</TabsTrigger>
          </TabsList>
          <TabsContent value="projects" className="space-y-4 mt-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-card/50 backdrop-blur-sm shadow-lg border-2">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
