import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Testimonial {
  id: string;
  client_name: string;
  content: string;
  rating?: number;
  status: string;
  created_at: string;
}

interface GenericTestimonialsManagerProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function GenericTestimonialsManager({ entityType, entityId }: GenericTestimonialsManagerProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const { toast } = useToast();

  const tableName = entityType === 'business' ? 'business_testimonials' : 'user_testimonials';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';

  useEffect(() => {
    loadTestimonials();
  }, [entityId]);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(idColumn, entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar depoimentos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      approved: "Aprovado",
      rejected: "Rejeitado",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const averageRating = testimonials
    .filter(t => t.status === "approved" && t.rating)
    .reduce((acc, t) => acc + (t.rating || 0), 0) / 
    testimonials.filter(t => t.status === "approved" && t.rating).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="h-5 w-5" />
          Depoimentos
        </CardTitle>
        <CardDescription>
          Depoimentos enviados por clientes (sujeitos a moderação)
        </CardDescription>
        {averageRating > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({testimonials.filter(t => t.status === "approved").length} avaliações)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {testimonials.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum depoimento recebido ainda
          </p>
        ) : (
          <div className="space-y-4">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{testimonial.client_name}</p>
                    {testimonial.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < testimonial.rating!
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {getStatusBadge(testimonial.status)}
                </div>
                <p className="text-sm text-muted-foreground">{testimonial.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(testimonial.created_at).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
