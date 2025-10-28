import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Testimonial {
  id: string;
  client_name: string;
  client_photo_url?: string;
  content: string;
  rating?: number;
  created_at: string;
}

interface PublicTestimonialsSliderProps {
  entityType: 'business' | 'user';
  entityId: string;
}

export function PublicTestimonialsSlider({ entityType, entityId }: PublicTestimonialsSliderProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const tableName = entityType === 'business' ? 'business_testimonials' : 'user_testimonials';
  const idColumn = entityType === 'business' ? 'business_id' : 'profile_id';

  useEffect(() => {
    loadTestimonials();
  }, [entityId]);

  const loadTestimonials = async () => {
    const query = supabase
      .from(tableName as any)
      .select("*")
      .eq(idColumn, entityId)
      .eq("active", true)
      .order("order_index", { ascending: true });

    const { data, error } = await query;
    
    if (!error && data) {
      setTestimonials(data as any);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (testimonials.length === 0) return null;

  const averageRating = testimonials
    .filter(t => t.rating)
    .reduce((acc, t) => acc + (t.rating || 0), 0) / 
    testimonials.filter(t => t.rating).length || 0;

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ThumbsUp className="h-6 w-6 text-pink-500" />
          Depoimentos
        </h2>
        {averageRating > 0 && (
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            <span className="font-semibold text-lg bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({testimonials.length})</span>
          </div>
        )}
      </div>

      {testimonials.length === 1 ? (
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-2 border-pink-500/20 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-pink-500/30">
                <AvatarImage src={currentTestimonial.client_photo_url} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                  {currentTestimonial.client_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{currentTestimonial.client_name}</p>
                {currentTestimonial.rating && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < currentTestimonial.rating!
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground italic">"{currentTestimonial.content}"</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-2 border-pink-500/20 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4 min-h-[300px] justify-center">
                <Avatar className="h-20 w-20 ring-4 ring-pink-500/30">
                  <AvatarImage src={currentTestimonial.client_photo_url} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                    {currentTestimonial.client_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{currentTestimonial.client_name}</p>
                  {currentTestimonial.rating && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < currentTestimonial.rating!
                              ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground italic max-w-2xl">
                  "{currentTestimonial.content}"
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-gradient-to-r from-pink-500/10 to-pink-600/10 border-pink-500/30 hover:bg-pink-500/20 hover:scale-110 transition-all"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-6 w-6 text-pink-500" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-gradient-to-r from-pink-500/10 to-pink-600/10 border-pink-500/30 hover:bg-pink-500/20 hover:scale-110 transition-all"
            onClick={nextSlide}
          >
            <ChevronRight className="h-6 w-6 text-pink-500" />
          </Button>

          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-gradient-to-r from-pink-500 to-pink-600 shadow-lg shadow-pink-500/50"
                    : "w-2 bg-muted-foreground/30 hover:bg-pink-500/50"
                }`}
                aria-label={`Ver depoimento ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
