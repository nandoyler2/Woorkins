import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Search, Star, Building2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";

interface SearchResult {
  slug: string;
  company_name: string;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  average_rating: number;
  total_reviews: number;
}

interface SearchSlideInProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchSlideIn = ({ isOpen, onClose }: SearchSlideInProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const gradId = useId();

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('business_profiles' as any)
          .select('slug, company_name, category, description, logo_url, average_rating, total_reviews')
          .or(`company_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(8);

        if (!error && data) {
          setResults(data as unknown as SearchResult[]);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleResultClick = (slug: string) => {
    navigate(`/${slug}`);
    onClose();
    setSearchTerm("");
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Slide-in panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[500px] bg-background shadow-2xl z-50",
          "animate-in slide-in-from-right duration-300"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold">Buscar</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search box */}
          <div className="p-4">
            <div className="relative">
              {/* Pulsing gradient shadow */}
              <div className="pointer-events-none absolute -inset-1 rounded-xl z-0 animate-pulse-slow">
                <div
                  className="absolute inset-0 rounded-xl blur-lg opacity-50"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                  }}
                />
              </div>

              {/* Search input */}
              <div className="relative z-10 flex gap-2 items-center rounded-xl border-2 border-foreground/20 bg-background p-2 shadow-lg">
                <div className="relative flex-1">
                  {/* Gradient search icon */}
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10"
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
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-11 pr-4 text-base rounded-lg border-0 focus-visible:ring-0 bg-transparent"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchTerm.trim() === "" ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Digite para buscar empresas e serviços</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleResultClick(result.slug)}
                    className="p-3 hover:bg-muted rounded-xl cursor-pointer transition-all hover:shadow-sm animate-in fade-in slide-in-from-right"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex gap-3 items-start">
                      {/* Logo */}
                      <div className="flex-shrink-0">
                        {result.logo_url ? (
                          <SafeImage
                            src={result.logo_url}
                            alt={result.company_name}
                            className="w-12 h-12 rounded-lg object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-2 border-border">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold truncate">{result.company_name}</h3>
                          
                          {/* Rating */}
                          {result.total_reviews > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-md flex-shrink-0">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              <span className="text-xs font-bold">{Number(result.average_rating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        {result.category && (
                          <p className="text-xs text-primary font-medium mb-1">{result.category}</p>
                        )}
                        
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-2">
                  Não achamos nada para "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
