import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface CodeViewerProps {
  code: string;
  currentPc: number;
  onLineClick: (address: number) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, currentPc, onLineClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lines = code.split('\n');

  // Find the line index that corresponds to the current PC
  const activeLineIndex = lines.findIndex(line => {
    const match = line.match(/^\s*0x([0-9a-fA-F]+):/);
    if (!match) return false;
    const address = parseInt(match[1], 16);
    return address === currentPc;
  });

  useEffect(() => {
    if (activeLineIndex !== -1 && scrollContainerRef.current) {
      const row = scrollContainerRef.current.children[activeLineIndex] as HTMLElement;
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex]);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full border border-white/10 overflow-hidden relative">
      {/* Header */}
      <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-neon-purple rounded-full animate-pulse-slow"></div>
           <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] font-mono">Source.yo</span>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">READ-ONLY</div>
      </div>
      
      {/* Code Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm space-y-[2px] relative"
      >
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

        {lines.map((line, idx) => {
           // Parse address for click functionality
           const match = line.match(/^\s*0x([0-9a-fA-F]+):/);
           const address = match ? parseInt(match[1], 16) : null;
           const isAddress = address !== null;
           
           const isActive = idx === activeLineIndex;

           return (
            <div 
              key={idx} 
              onClick={() => isAddress && address !== null && onLineClick(address)}
              className={clsx(
                "relative pl-3 pr-4 py-1.5 rounded-r-md transition-all duration-300 border-l-[3px]",
                isActive 
                  ? "bg-gradient-to-r from-neon-blue/20 to-transparent border-neon-blue shadow-[0_0_15px_rgba(45,226,230,0.1)] z-10 scale-[1.01] origin-left" 
                  : "border-transparent text-gray-600 hover:bg-white/5 hover:text-gray-400",
                isAddress && !isActive && "cursor-pointer hover:border-l-white/20"
              )}
            >
              {/* Active Line Shimmer Bar */}
              {isActive && (
                 <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white animate-pulse shadow-[0_0_10px_white]"></div>
              )}

              <div className="flex items-start">
                {/* Line Number */}
                <span className={clsx(
                    "select-none mr-4 w-6 text-right text-[10px] mt-[2px]",
                    isActive ? "text-neon-cyan font-bold" : "opacity-30"
                )}>
                    {idx + 1}
                </span>

                {/* Code Content */}
                <div className={clsx(
                    "whitespace-pre font-medium tracking-wide",
                    isActive ? "text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]" : ""
                )}>
                  {isAddress ? (
                     <>
                       <span className={isActive ? "text-neon-purple" : "text-purple-900/70"}>
                          {line.substring(0, line.indexOf(':') + 1)}
                       </span>
                       <span className={isActive ? "text-gray-100" : "text-gray-600"}>
                          {line.substring(line.indexOf(':') + 1)}
                       </span>
                     </>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodeViewer;