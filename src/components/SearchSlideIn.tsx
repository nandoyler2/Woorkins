import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
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
          .from('profiles')
          .select('username, full_name, company_name, slug, category, description, logo_url, avatar_url, profile_type, average_rating, total_reviews')
          .or(`company_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
          .limit(8);

        if (!error && data) {
          setResults(data.map(item => ({
            slug: item.slug || item.username,
            company_name: item.company_name || item.full_name,
            category: item.category,
            description: item.description,
            logo_url: item.logo_url || item.avatar_url,
            average_rating: item.average_rating || 0,
            total_reviews: item.total_reviews || 0
          })) as SearchResult[]);
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

  const modalContent = (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal centered */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl">
          <div 
            className={cn(
              "bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-foreground/10",
              "animate-in zoom-in-95 fade-in duration-300"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold">Buscar</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-foreground/5">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Search box */}
              <div className="p-6">
                <div className="relative">
                  {/* Pulsing gradient shadow */}
                  <div className="pointer-events-none absolute -inset-1 rounded-2xl z-0 animate-pulse-slow">
                    <div
                      className="absolute inset-0 rounded-2xl blur-lg opacity-50"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                      }}
                    />
                  </div>

                  {/* Search input */}
                  <div className="relative z-10 flex gap-2 items-center rounded-2xl border-2 border-foreground/20 bg-background/60 backdrop-blur-sm p-3 shadow-lg">
                    <div className="relative flex-1">
                      {/* Gradient search icon */}
                      <svg
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 z-10"
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
                        placeholder="Buscar empresas, serviços, produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-16 pl-14 pr-4 text-lg rounded-xl border-0 focus-visible:ring-0 bg-transparent"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 max-h-[calc(85vh-180px)]">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                ) : searchTerm.trim() === "" ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Search className="w-20 h-20 mx-auto mb-6 opacity-30" />
                    <p className="text-lg">Digite para buscar empresas e serviços</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        onClick={() => handleResultClick(result.slug)}
                        className="p-4 hover:bg-foreground/5 rounded-2xl cursor-pointer transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom backdrop-blur-sm"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex gap-4 items-start">
                          {/* Logo */}
                          <div className="flex-shrink-0">
                            {result.logo_url ? (
                              <SafeImage
                                src={result.logo_url}
                                alt={result.company_name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-border"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-2 border-border">
                                <Building2 className="w-7 h-7 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-base font-bold truncate">{result.company_name}</h3>
                              
                              {/* Rating */}
                              {result.total_reviews > 0 && (
                                <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-lg flex-shrink-0">
                                  <Star className="w-4 h-4 fill-primary text-primary" />
                                  <span className="text-sm font-bold">{Number(result.average_rating).toFixed(1)}</span>
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
                  <div className="text-center py-16">
                    <p className="text-base text-muted-foreground">
                      Não achamos nada para "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};
