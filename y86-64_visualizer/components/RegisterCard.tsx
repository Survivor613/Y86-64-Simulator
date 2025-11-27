import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { toHex } from '../utils/format';

interface RegisterCardProps {
  name: string;
  value: number;
  prevValue?: number;
}

const RegisterCard: React.FC<RegisterCardProps> = ({ name, value, prevValue }) => {
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (prevValue !== undefined && value !== prevValue) {
      setChanged(true);
      const timer = setTimeout(() => setChanged(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <div className={clsx(
      "relative group flex justify-between items-center px-3 py-2 rounded border transition-all duration-300 backdrop-blur-sm",
      changed 
        ? "bg-neon-cyan/10 border-neon-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.3)] z-10" 
        : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
    )}>
      {/* Label Tag */}
      <div className="flex items-center gap-2">
        <div className={clsx(
          "w-1 h-3 rounded-full transition-colors",
          changed ? "bg-neon-cyan" : "bg-neon-blue/50"
        )} />
        <span className="text-neon-blue font-mono text-[10px] uppercase tracking-widest opacity-80">{name}</span>
      </div>

      {/* Value */}
      <span className={clsx(
        "font-mono text-sm tracking-wider transition-all duration-200 z-10",
        changed ? "text-white font-bold text-shadow-neon" : "text-gray-400 group-hover:text-gray-200"
      )}>
        {toHex(value)}
      </span>

      {/* Background Pulse Effect for Change */}
      {changed && (
        <span className="absolute inset-0 rounded bg-neon-cyan/10 animate-ping opacity-20 pointer-events-none" />
      )}
    </div>
  );
};

export default RegisterCard;