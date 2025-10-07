export const SectionDivider = () => {
  return (
    <div className="relative w-full h-32 overflow-hidden">
      {/* Wave SVG with gradient fade */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1200 120" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Horizontal color gradient */}
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        
        {/* Wave layers */}
        <path 
          d="M0,60 C300,90 600,30 900,60 C1050,75 1150,60 1200,60 L1200,120 L0,120 Z" 
          fill="url(#waveGradient)"
          opacity="0.6"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
          }}
        />
        <path 
          d="M0,70 C300,40 600,80 900,50 C1050,35 1150,50 1200,70 L1200,120 L0,120 Z" 
          fill="url(#waveGradient)"
          opacity="0.4"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
          }}
        />
      </svg>
    </div>
  );
};
