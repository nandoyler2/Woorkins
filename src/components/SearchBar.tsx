import { useState, useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const fullPlaceholder = "Buscar empresas, negócios e produtos...";

  // Simulated database of companies, businesses, and products
  const mockData = [
    "Tech Solutions", "Digital Marketing", "Software Development",
    "Cloud Services", "E-commerce Platform", "Mobile Apps",
    "Web Design", "Consulting Services", "AI Solutions",
    "Data Analytics", "Cybersecurity", "Social Media Management"
  ];

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
    const timer = setTimeout(() => {
      const filtered = mockData.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      <div className="relative">
        {/* Unified circular ring around input + button */}
        {isSearching && (
          <div className="pointer-events-none absolute -inset-3 rounded-[1.75rem] z-0">
            <div
              className="absolute inset-0 rounded-[1.75rem] animate-spin-slow"
              style={{
                background:
                  'conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))',
              }}
            />
            {/* Mask the center so only the ring is visible */}
            <div className="absolute inset-[3px] rounded-[1.5rem] bg-background" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 flex gap-3 items-center rounded-2xl">
          <div className="relative flex-1">
            {/* Gradient stroke search icon */}
            {(() => {
              const gradId = useId();
              return (
                <svg
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 z-10"
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
              );
            })()}
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'h-16 md:h-20 pl-16 md:pl-20 pr-6 text-lg md:text-2xl rounded-2xl border-2 transition-all relative z-10 bg-background',
                isSearching
                  ? 'border-primary/50 shadow-glow'
                  : 'border-foreground/20 hover:border-primary/30 shadow-elegant hover:shadow-glow'
              )}
            />
          </div>

          <div className="relative">
            <Button
              size="lg"
              disabled={isSearching}
              onClick={() => {
                setIsSearching(true);
                const filtered = mockData.filter((item) =>
                  item.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setTimeout(() => {
                  setResults(filtered);
                  setShowResults(true);
                  setIsSearching(false);
                }, 400);
              }}
              className={cn(
                'h-16 md:h-20 px-8 md:px-10 rounded-2xl bg-gradient-primary text-white font-semibold text-lg md:text-xl shadow-glow hover:shadow-elegant transition-all relative',
                isSearching && 'pointer-events-none'
              )}
            >
              <Search className="w-6 h-6" />
              <span className="ml-2 hidden md:inline">Buscar</span>
            </Button>
          </div>
        </div>
      </div>

      {showResults && (
        <div className="absolute top-full mt-4 w-full bg-background border-2 border-foreground/20 rounded-2xl shadow-elegant overflow-hidden z-50">
          {results.length > 0 ? (
            <div className="p-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-muted rounded-lg cursor-pointer transition-colors text-base md:text-lg"
                >
                  {result}
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
