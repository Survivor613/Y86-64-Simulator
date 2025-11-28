import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Cpu, Box, Activity, Layers, Monitor, HardDrive, Disc } from 'lucide-react';
import FileUpload from './components/FileUpload';
import RegisterCard from './components/RegisterCard';
import CodeViewer from './components/CodeViewer';
import MemoryGrid from './components/MemoryGrid';
import { runSimulation } from './services/simulatorService';
import { SimulationResult, Stat } from './types';
import { REGISTER_ORDER, INITIAL_REGISTERS } from './constants';
import { clsx } from 'clsx';
import { toAddressHex } from './utils/format';

function App() {
  // State
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  
  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed Values
  const totalSteps = simulationData?.steps.length || 0;
  const currentStepData = simulationData?.steps[currentStepIndex];
  
  // Logic Fix: Registers fallback
  const registers = currentStepData?.REG || INITIAL_REGISTERS;
  const prevRegisters = currentStepIndex > 0 ? simulationData?.steps[currentStepIndex - 1].REG : undefined;
  
  const cc = currentStepData?.CC || { ZF: 1, SF: 0, OF: 0 };
  const stat = currentStepData?.STAT || Stat.AOK;

  // Handlers
  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    try {
      const result = await runSimulation(file);
      setSimulationData(result);
      setCurrentStepIndex(0); // Start at Step 0 (Initial State)
      setIsPlaying(false);
    } catch (err) {
      console.error("Simulation failed", err);
      alert("Failed to run simulation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchFile = () => {
    setIsPlaying(false);
    setSimulationData(null);
    setCurrentStepIndex(0);
    setFileName("");
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const reset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const stepForward = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const stepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleJumpToAddress = (address: number) => {
    if (!simulationData) return;
    
    // Find the first step where the PC matches the clicked address
    const targetIndex = simulationData.steps.findIndex(step => step.PC === address);
    
    if (targetIndex !== -1) {
      setIsPlaying(false);
      setCurrentStepIndex(targetIndex);
    }
  };

  // Playback Loop
  useEffect(() => {
    if (isPlaying && currentStepIndex < totalSteps - 1) {
      intervalRef.current = setInterval(() => {
        // Use functional state update to access latest state inside closure if needed,
        // though dependency array handles it.
        setCurrentStepIndex(prev => {
            if (prev < totalSteps - 1) return prev + 1;
            setIsPlaying(false);
            return prev;
        });
      }, playbackSpeed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSteps, playbackSpeed]);


  // Helper: Status Visualization
  const getStatConfig = (s: number) => {
      switch(s) {
          case Stat.AOK: return { label: 'AOK', color: 'text-neon-green', bg: 'bg-neon-green', shadow: 'shadow-neon-green' };
          case Stat.HLT: return { label: 'HLT', color: 'text-neon-red', bg: 'bg-neon-red', shadow: 'shadow-neon-red' };
          case Stat.ADR: return { label: 'ADR', color: 'text-orange-400', bg: 'bg-orange-400', shadow: 'shadow-orange-400' };
          case Stat.INS: return { label: 'INS', color: 'text-orange-400', bg: 'bg-orange-400', shadow: 'shadow-orange-400' };
          default: return { label: 'UNK', color: 'text-gray-400', bg: 'bg-gray-400', shadow: 'shadow-gray-400' };
      }
  };
  const statConfig = getStatConfig(stat);

  return (
    <div className="min-h-screen bg-background text-gray-200 selection:bg-neon-cyan/30 flex flex-col font-sans overflow-hidden relative">
      <div className="scan-overlay"></div>

      {/* --- HEADER --- */}
      <header className="h-16 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-md flex items-center px-8 sticky top-0 z-50 justify-between">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="relative">
            <Cpu className="w-6 h-6 text-neon-blue animate-pulse-slow" />
            <div className="absolute inset-0 bg-neon-blue blur-lg opacity-40"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 leading-none">
              Y86-64 <span className="font-light text-neon-cyan">ARCHITECT</span>
            </h1>
            <span className="text-[9px] text-gray-600 tracking-[0.3em] font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-6">
          {simulationData && (
             <div className="flex items-center gap-4 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                <span className="text-xs text-gray-400 font-mono flex items-center gap-2">
                   <Disc size={12} className="text-neon-purple" />
                   {fileName}
                </span>
                <div className="h-3 w-px bg-gray-700"></div>
                <button 
                  onClick={handleSwitchFile}
                  className="text-[10px] text-neon-red hover:text-white uppercase tracking-wider font-bold transition-colors hover:scale-105"
                >
                  Eject
                </button>
             </div>
          )}
          <div className="hidden md:flex gap-4 text-xs font-mono text-gray-500">
             <span>CPU: <span className="text-neon-green">READY</span></span>
             <span>MEM: <span className="text-neon-green">ALLOCATED</span></span>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-6 max-w-[1800px] mx-auto w-full flex flex-col gap-6 relative z-10">
        
        {/* 1. INITIAL UPLOAD STATE */}
        {!simulationData && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh]">
             <div className="w-full max-w-xl relative">
               <div className="absolute -inset-1 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur opacity-20 animate-glow"></div>
               <div className="relative">
                 <h2 className="text-4xl font-bold text-center mb-6 text-white tracking-tight">
                   Initialize Simulation
                 </h2>
                 <FileUpload onUpload={handleUpload} isLoading={isLoading} />
               </div>
             </div>
          </div>
        )}

        {/* 2. SIMULATION DASHBOARD */}
        {simulationData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] pb-24">
            
            {/* LEFT COL: SYSTEMS MONITOR (3/12) */}
            <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
               
               {/* HUD PANEL */}
               <div className="glass-panel p-5 rounded-2xl flex flex-col gap-5 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-20"><Activity className="text-neon-cyan" size={40} /></div>
                  
                  {/* PC Display */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Program Counter</span>
                    <div className="bg-black/40 border border-neon-blue/30 p-3 rounded-lg shadow-[0_0_15px_rgba(45,226,230,0.1)] backdrop-blur-sm relative overflow-hidden group">
                       <span className="font-mono text-2xl text-neon-blue font-bold tracking-widest relative z-10">
                         {toAddressHex(currentStepData?.PC || 0)}
                       </span>
                       {/* Subtle scan line inside PC */}
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-blue/10 to-transparent translate-y-[-100%] animate-scanline"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     {/* STAT Display */}
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Status</span>
                        <div className={clsx(
                          "px-3 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all duration-300",
                          `border-${statConfig.bg}/30 bg-${statConfig.bg}/10`
                        )}>
                            <div className={clsx("w-2 h-2 rounded-full animate-pulse", statConfig.bg)}></div>
                            <span className={clsx("font-mono font-bold text-sm tracking-wider", statConfig.color)}>
                              {statConfig.label}
                            </span>
                        </div>
                     </div>

                     {/* Cycle Count */}
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Cycle</span>
                        <div className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                            <span className="font-mono text-sm text-gray-300">
                               {currentStepIndex} <span className="text-gray-600">/ {totalSteps - 1}</span>
                            </span>
                        </div>
                     </div>
                  </div>

                  {/* CC Flags */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Condition Codes</span>
                     <div className="flex gap-2">
                        {['ZF', 'SF', 'OF'].map((flag) => {
                          const key = flag as keyof typeof cc;
                          const isActive = cc[key] === 1;
                          return (
                            <div key={flag} className={clsx(
                              "flex-1 flex flex-col items-center py-2 rounded transition-all duration-300 border",
                              isActive 
                                ? "bg-neon-purple/20 border-neon-purple/50 shadow-[0_0_10px_rgba(188,19,254,0.2)]" 
                                : "bg-white/5 border-transparent opacity-50"
                            )}>
                               <span className={clsx("text-[10px] font-bold mb-1", isActive ? "text-neon-purple" : "text-gray-500")}>{flag}</span>
                               <div className={clsx("w-1.5 h-1.5 rounded-full transition-all", isActive ? "bg-neon-purple shadow-[0_0_5px_#bc13fe]" : "bg-gray-700")} />
                            </div>
                          )
                        })}
                     </div>
                  </div>
               </div>

               {/* REGISTERS */}
               <div className="glass-panel flex-1 rounded-2xl overflow-hidden flex flex-col border border-white/10 relative">
                  <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center gap-2 backdrop-blur-md">
                    <Layers className="w-4 h-4 text-neon-blue" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] font-mono">Registers</span>
                  </div>
                  <div className="p-3 overflow-y-auto scrollbar-hide flex-1 space-y-1.5">
                     {REGISTER_ORDER.map(reg => (
                       <RegisterCard 
                          key={reg} 
                          name={reg} 
                          value={registers[reg]} 
                          prevValue={prevRegisters?.[reg]} 
                        />
                     ))}
                  </div>
               </div>
            </div>

            {/* CENTER COL: CODE VIEW (6/12) */}
            <div className="lg:col-span-6 h-full flex flex-col">
               <CodeViewer 
                 code={simulationData.sourceCode} 
                 currentPc={currentStepData?.PC || 0} 
                 onLineClick={handleJumpToAddress}
               />
            </div>

            {/* RIGHT COL: MEMORY (3/12) */}
            <div className="lg:col-span-3 h-full">
               <MemoryGrid memory={currentStepData?.MEM || {}} />
            </div>
          </div>
        )}
      </main>

      {/* --- FLOATING CONTROL DECK --- */}
      {simulationData && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
           <div className="glass-panel rounded-full p-2 pl-6 pr-2 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl bg-[#0B0F14]/80">
              
              {/* Progress Bar & Step Info */}
              <div className="flex flex-col flex-1 mr-8">
                 <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1 px-1">
                    <span>STEP {currentStepIndex}</span>
                    <span>END {totalSteps - 1}</span>
                 </div>
                 <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden group cursor-pointer">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(45,226,230,0.5)]"
                      style={{ width: `${(currentStepIndex / (totalSteps - 1)) * 100}%` }}
                    />
                    <input 
                      type="range" 
                      min="0" 
                      max={totalSteps > 0 ? totalSteps - 1 : 0} 
                      value={currentStepIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCurrentStepIndex(parseInt(e.target.value));
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                 </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-2">
                  <button onClick={reset} className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Restart">
                    <RotateCcw size={18} />
                  </button>
                  <button onClick={stepBackward} className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" disabled={currentStepIndex === 0}>
                    <SkipBack size={20} />
                  </button>

                  <button 
                    onClick={togglePlay} 
                    className={clsx(
                      "w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg border border-white/10",
                      isPlaying 
                        ? "bg-neon-red text-white shadow-[0_0_20px_rgba(255,42,109,0.4)] hover:shadow-[0_0_30px_rgba(255,42,109,0.6)]" 
                        : "bg-neon-blue text-black shadow-[0_0_20px_rgba(45,226,230,0.4)] hover:shadow-[0_0_30px_rgba(45,226,230,0.6)] hover:scale-105"
                    )}
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>

                  <button onClick={stepForward} className="p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" disabled={currentStepIndex >= totalSteps - 1}>
                    <SkipForward size={20} />
                  </button>

                  {/* Speed Dial */}
                  <div className="relative group ml-2">
                     <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-colors">
                        <Activity size={18} />
                     </button>
                     {/* Speed Popup */}
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-4 hidden group-hover:flex flex-col z-50">
                       <div className="bg-[#1a1f2e] border border-white/10 rounded-lg p-1 shadow-xl flex flex-col">
                        {[1000, 500, 200, 50].map((speed) => (
                           <button 
                             key={speed}
                             onClick={() => setPlaybackSpeed(speed)}
                             className={clsx(
                               "px-3 py-1 text-[10px] font-mono hover:bg-white/10 rounded transition-colors whitespace-nowrap",
                               playbackSpeed === speed ? "text-neon-cyan" : "text-gray-400"
                             )}
                           >
                              {speed === 1000 ? 'SLOW' : speed === 500 ? 'NORM' : speed === 200 ? 'FAST' : 'TURBO'}
                           </button>
                        ))}
                       </div>
                     </div>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;