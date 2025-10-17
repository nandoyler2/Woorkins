import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Building2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";

interface SearchResult {
  identifier: string;
  name: string;
  type: 'user' | 'business';
  category: string | null;
  description: string | null;
  image_url: string | null;
  rating?: number;
  reviews?: number;
}

export const SearchBar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const fullPlaceholder = "Buscar pessoas, empresas, negócios...";
  const gradId = useId();

  // Typing animation for placeholder
  useEffect(() => {
    if (searchTerm) {
      setPlaceholder("");
      return;
    }

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullPlaceholder.length) {
        setPlaceholder(fullPlaceholder.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [searchTerm]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        // Buscar perfis de usuários
        const { data: userProfiles } = await supabase
          .from('profiles' as any)
          .select('username, full_name, bio, avatar_url')
          .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
          .limit(5);

        // Buscar perfis de negócios
        const { data: businessProfiles } = await supabase
          .from('business_profiles' as any)
          .select('slug, company_name, category, description, logo_url, average_rating, total_reviews')
          .eq('deleted', false)
          .or(`company_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(5);

        // Combinar resultados
        const combinedResults: SearchResult[] = [
          ...(userProfiles || []).map((profile: any) => ({
            identifier: profile.username,
            name: profile.full_name || profile.username,
            type: 'user' as const,
            category: null,
            description: profile.bio,
            image_url: profile.avatar_url,
          })),
          ...(businessProfiles || []).map((business: any) => ({
            identifier: business.slug,
            name: business.company_name,
            type: 'business' as const,
            category: business.category,
            description: business.description,
            image_url: business.logo_url,
            rating: business.average_rating,
            reviews: business.total_reviews,
          })),
        ];

        setResults(combinedResults);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      }
      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <div className="relative">
        {/* Pulsing gradient shadow behind search box - always visible */}
        <div className="pointer-events-none absolute -inset-2 rounded-2xl z-0 animate-pulse-slow">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-70"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            }}
          />
        </div>

        {/* Content with unified border */}
        <div className="relative z-10 flex gap-3 items-center rounded-2xl border-2 border-foreground/20 bg-background p-2 shadow-elegant">
          <div className="relative flex-1">
            {/* Gradient stroke search icon */}
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'h-16 md:h-20 pl-14 md:pl-16 pr-4 text-lg md:text-2xl rounded-xl border-0 focus-visible:ring-0 bg-transparent transition-all relative z-10'
              )}
            />
          </div>

          <Button
            size="lg"
            disabled={isSearching}
            className={cn(
              'h-16 md:h-20 px-8 md:px-10 rounded-xl bg-gradient-primary text-white font-semibold text-lg md:text-xl shadow-glow hover:shadow-elegant transition-all relative',
              isSearching && 'pointer-events-none opacity-90'
            )}
          >
            <Search className="w-6 h-6" />
            <span className="ml-2 hidden md:inline">Buscar</span>
          </Button>
        </div>
      </div>

      {showResults && (
        <div className="absolute top-full mt-4 w-full bg-background border-2 border-foreground/20 rounded-2xl shadow-elegant overflow-hidden z-50">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => {
                    navigate(`/${result.identifier}`);
                    setShowResults(false);
                    setSearchTerm("");
                  }}
                  className="p-4 hover:bg-muted rounded-xl cursor-pointer transition-all hover:shadow-sm"
                >
                  <div className="flex gap-4 items-start">
                    {/* Imagem/Avatar */}
                    <div className="flex-shrink-0">
                      {result.image_url ? (
                        <SafeImage
                          src={result.image_url}
                          alt={result.name}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-2 border-border">
                          {result.type === 'business' ? (
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base md:text-lg font-bold truncate">{result.name}</h3>
                          <Badge variant={result.type === 'business' ? 'default' : 'secondary'} className="text-xs">
                            {result.type === 'business' ? 'Empresa' : 'Pessoa'}
                          </Badge>
                        </div>
                        
                        {/* Rating (só para negócios) */}
                        {result.type === 'business' && result.reviews && result.reviews > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg flex-shrink-0">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm font-bold">{Number(result.rating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({result.reviews})</span>
                          </div>
                        )}
                      </div>

                      {result.category && (
                        <p className="text-sm text-primary font-medium mb-1">{result.category}</p>
                      )}
                      
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 md:p-8 text-center">
              <p className="text-base md:text-lg text-muted-foreground mb-2">
                Não encontramos nada para "{searchTerm}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
