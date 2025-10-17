import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ThumbsUp } from "lucide-react";

interface Testimonial {
  id: string;
  client_name: string;
  content: string;
  rating?: number;
  created_at: string;
}

interface PublicBusinessTestimonialsProps {
  businessId: string;
}

export function PublicBusinessTestimonials({ businessId }: PublicBusinessTestimonialsProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    loadTestimonials();
  }, [businessId]);

  const loadTestimonials = async () => {
    const { data } = await supabase
      .from("business_testimonials")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    setTestimonials(data || []);
  };

  if (testimonials.length === 0) return null;

  const averageRating = testimonials
    .filter(t => t.rating)
    .reduce((acc, t) => acc + (t.rating || 0), 0) / 
    testimonials.filter(t => t.rating).length || 0;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ThumbsUp className="h-6 w-6" />
          Depoimentos
        </h2>
        {averageRating > 0 && (
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-lg">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({testimonials.length})</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">{testimonial.client_name}</p>
                {testimonial.rating && (
                  <div className="flex items-center gap-1">
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
              <p className="text-sm text-muted-foreground">{testimonial.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(testimonial.created_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
