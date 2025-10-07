export const SectionDivider = () => {
  return (
    <div className="relative w-full h-32 overflow-hidden">
      {/* Wave SVG */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1200 120" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
          
          {/* Vertical fade gradient */}
          <linearGradient id="verticalFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopOpacity="0" />
            <stop offset="20%" stopOpacity="0.4" />
            <stop offset="50%" stopOpacity="0.6" />
            <stop offset="80%" stopOpacity="0.4" />
            <stop offset="100%" stopOpacity="0" />
          </linearGradient>
          
          {/* Mask combining both gradients */}
          <mask id="fadeMask">
            <rect width="1200" height="120" fill="url(#verticalFade)" />
          </mask>
        </defs>
        
        {/* Wave with fade effect */}
        <g mask="url(#fadeMask)">
          <path 
            d="M0,60 C300,90 600,30 900,60 C1050,75 1150,60 1200,60 L1200,120 L0,120 Z" 
            fill="url(#waveGradient)"
            opacity="0.5"
          />
          <path 
            d="M0,70 C300,40 600,80 900,50 C1050,35 1150,50 1200,70 L1200,120 L0,120 Z" 
            fill="url(#waveGradient)"
            opacity="0.3"
          />
        </g>
      </svg>
    </div>
  );
};
