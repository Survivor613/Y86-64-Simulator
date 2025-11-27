import React from 'react';
import { MemoryMap } from '../types';
import { toAddressHex, toHex } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryGridProps {
  memory: MemoryMap;
}

const MemoryGrid: React.FC<MemoryGridProps> = ({ memory }) => {
  const addresses = Object.keys(memory).map(Number).sort((a, b) => a - b);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden border border-white/10 relative">
      {/* Header */}
      <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse-slow"></div>
           <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] font-mono">Memory</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 scrollbar-hide relative">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none"></div>

        {addresses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-700 font-mono text-xs gap-2">
            <div className="w-12 h-12 border border-dashed border-gray-800 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
            </div>
            <span>NO DATA ALLOCATED</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            <AnimatePresence>
            {addresses.map((addr) => (
              <motion.div 
                key={addr}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="group relative flex items-center justify-between p-3 rounded bg-gray-900/60 border border-white/5 hover:border-neon-green/30 hover:bg-neon-green/5 transition-all duration-300"
              >
                {/* Decoration Corner */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/10 group-hover:border-neon-green/50 transition-colors rounded-tr-sm"></div>

                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-mono tracking-wider mb-0.5 group-hover:text-neon-green transition-colors">ADDR</span>
                  <span className="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">{toAddressHex(addr)}</span>
                </div>
                
                <div className="h-6 w-px bg-white/10 mx-2 group-hover:bg-neon-green/20 transition-colors"></div>
                
                <div className="flex flex-col items-end">
                   <span className="text-[9px] text-gray-500 font-mono tracking-wider mb-0.5 group-hover:text-neon-green transition-colors">DATA</span>
                   <span className="text-xs font-mono text-neon-green font-bold tracking-widest text-shadow-sm">{toHex(memory[addr.toString()])}</span>
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGrid;