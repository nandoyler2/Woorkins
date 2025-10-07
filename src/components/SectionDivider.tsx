export const SectionDivider = () => {
  return (
    <div className="relative w-full h-24 overflow-hidden">
      {/* Gradient background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--primary)))',
        }}
      />
      
      {/* Wave SVG */}
      <svg 
        className="absolute bottom-0 w-full h-full" 
        viewBox="0 0 1200 120" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Multiple wave layers for depth */}
        <path 
          d="M0,60 C300,90 600,30 900,60 C1050,75 1150,60 1200,60 L1200,120 L0,120 Z" 
          fill="url(#waveGradient)"
          opacity="0.7"
        />
        <path 
          d="M0,70 C300,40 600,80 900,50 C1050,35 1150,50 1200,70 L1200,120 L0,120 Z" 
          fill="url(#waveGradient)"
          opacity="0.5"
        />
        <path 
          d="M0,80 C300,60 600,100 900,70 C1050,55 1150,70 1200,90 L1200,120 L0,120 Z" 
          fill="hsl(var(--background))"
        />
      </svg>
    </div>
  );
};
