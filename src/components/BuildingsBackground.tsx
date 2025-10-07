import { useEffect, useState } from "react";

interface Window {
  id: number;
  delay: number;
  duration: number;
}

const BuildingsBackground = () => {
  const [windows, setWindows] = useState<Window[]>([]);

  useEffect(() => {
    // Generate random windows
    const generatedWindows: Window[] = [];
    for (let i = 0; i < 80; i++) {
      generatedWindows.push({
        id: i,
        delay: Math.random() * 5,
        duration: 1 + Math.random() * 3,
      });
    }
    setWindows(generatedWindows);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      {/* Building 1 - Left */}
      <div className="absolute bottom-0 left-[5%] w-32 h-96 bg-gradient-to-t from-foreground/80 to-foreground/60 rounded-t-sm">
        <div className="grid grid-cols-4 gap-2 p-3 h-full">
          {windows.slice(0, 20).map((window) => (
            <div
              key={window.id}
              className="bg-primary/40 rounded-sm"
              style={{
                animation: `pulse ${window.duration}s ease-in-out ${window.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Building 2 - Left Center */}
      <div className="absolute bottom-0 left-[20%] w-40 h-[500px] bg-gradient-to-t from-foreground/90 to-foreground/70 rounded-t-sm">
        <div className="grid grid-cols-5 gap-2 p-3 h-full">
          {windows.slice(20, 45).map((window) => (
            <div
              key={window.id}
              className="bg-secondary/40 rounded-sm"
              style={{
                animation: `pulse ${window.duration}s ease-in-out ${window.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Building 3 - Center */}
      <div className="absolute bottom-0 left-[40%] w-36 h-[450px] bg-gradient-to-t from-foreground/85 to-foreground/65 rounded-t-sm">
        <div className="grid grid-cols-4 gap-2 p-3 h-full">
          {windows.slice(45, 65).map((window) => (
            <div
              key={window.id}
              className="bg-accent/40 rounded-sm"
              style={{
                animation: `pulse ${window.duration}s ease-in-out ${window.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Building 4 - Right Center */}
      <div className="absolute bottom-0 right-[25%] w-44 h-[480px] bg-gradient-to-t from-foreground/80 to-foreground/60 rounded-t-sm">
        <div className="grid grid-cols-5 gap-2 p-3 h-full">
          {windows.slice(65, 90).map((window) => (
            <div
              key={window.id}
              className="bg-primary/40 rounded-sm"
              style={{
                animation: `pulse ${window.duration}s ease-in-out ${window.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Building 5 - Right */}
      <div className="absolute bottom-0 right-[8%] w-32 h-[420px] bg-gradient-to-t from-foreground/75 to-foreground/55 rounded-t-sm">
        <div className="grid grid-cols-4 gap-2 p-3 h-full">
          {windows.slice(70, 90).map((window) => (
            <div
              key={window.id}
              className="bg-secondary/40 rounded-sm"
              style={{
                animation: `pulse ${window.duration}s ease-in-out ${window.delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuildingsBackground;
