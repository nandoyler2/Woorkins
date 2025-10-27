import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, Building2, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";

interface SearchResult {
  type: 'user' | 'business';
  identifier: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  average_rating?: number;
  total_reviews?: number;
  username?: string;
}

export const SearchBar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const fullPlaceholder = "Buscar pessoas, empresas e negócios...";
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
        // Buscar todos os perfis (usuários e negócios)
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name, company_name, slug, category, description, bio, logo_url, avatar_url, profile_type, average_rating, total_reviews')
          .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
          .limit(10);

        const combinedResults: SearchResult[] = [];

        // Mapear resultados
        if (data) {
          data.forEach((item: any) => {
            if (item.profile_type === 'business') {
              combinedResults.push({
                type: 'business',
                identifier: item.slug || item.username,
                name: item.company_name || item.full_name,
                category: item.category,
                description: item.description,
                image_url: item.logo_url || item.avatar_url,
                average_rating: item.average_rating,
                total_reviews: item.total_reviews,
              });
            } else {
              combinedResults.push({
                type: 'user',
                identifier: item.username,
                name: item.full_name || item.username,
                category: null,
                description: item.bio,
                image_url: item.avatar_url,
                username: item.username,
              });
            }
          });
        }

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

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      // Buscar todos os perfis (usuários e negócios)
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, company_name, slug, category, description, bio, logo_url, avatar_url, profile_type, average_rating, total_reviews')
        .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(10);

      const combinedResults: SearchResult[] = [];

      if (data) {
        data.forEach((item: any) => {
          if (item.profile_type === 'business') {
            combinedResults.push({
              type: 'business',
              identifier: item.slug || item.username,
              name: item.company_name || item.full_name,
              category: item.category,
              description: item.description,
              image_url: item.logo_url || item.avatar_url,
              average_rating: item.average_rating,
              total_reviews: item.total_reviews,
            });
          } else {
            combinedResults.push({
              type: 'user',
              identifier: item.username,
              name: item.full_name || item.username,
              category: null,
              description: item.bio,
              image_url: item.avatar_url,
              username: item.username,
            });
          }
        });
      }

      setResults(combinedResults);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    }
    setShowResults(true);
    setIsSearching(false);
  };

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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={cn(
                'h-16 md:h-20 pl-14 md:pl-16 pr-4 text-lg md:text-2xl rounded-xl border-0 focus-visible:ring-0 bg-transparent transition-all relative z-10'
              )}
            />
          </div>

          <Button
            size="lg"
            disabled={isSearching}
            onClick={handleSearch}
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
                    {/* Image/Avatar */}
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
                            <div className="text-2xl font-bold text-muted-foreground">
                              {result.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base md:text-lg font-bold truncate">{result.name}</h3>
                          {result.type === 'user' && result.username && (
                            <span className="text-sm text-muted-foreground">@{result.username}</span>
                          )}
                        </div>
                        
                        {/* Rating (só para negócios) */}
                        {result.type === 'business' && result.total_reviews && result.total_reviews > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg flex-shrink-0">
                            <Star className="w-4 h-4 fill-primary text-primary" />
                            <span className="text-sm font-bold">{Number(result.average_rating).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({result.total_reviews})</span>
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
              <p className="text-base md:text-lg text-muted-foreground mb-4">
                Não achamos nada para "{searchTerm}"
              </p>
              <p className="text-base md:text-lg mb-4">
                Crie agora a marca ou o produto sobre isso{" "}
                <Link 
                  to="/auth?mode=signup"
                  className="text-primary font-bold hover:underline"
                  onClick={() => setShowResults(false)}
                >
                  clique aqui
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
