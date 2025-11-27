import React, { useCallback, useState } from 'react';
import { Upload, Loader2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "relative group cursor-pointer transition-all duration-700 ease-out p-1 rounded-3xl overflow-hidden h-72 w-full",
        isDragging ? "scale-[1.02]" : "hover:scale-[1.01]"
      )}
    >
      <input
        type="file"
        accept=".yo"
        onChange={handleFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
      />

      {/* --- FLUID LIQUID BACKGROUND --- */}
      <div className="absolute inset-0 bg-[#0B0F14] z-0">
        {/* Animated Blobs */}
        <div className={clsx(
            "absolute top-0 -left-4 w-72 h-72 bg-neon-purple rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob",
            isDragging && "opacity-60 duration-100"
        )}></div>
        <div className={clsx(
            "absolute top-0 -right-4 w-72 h-72 bg-neon-cyan rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000",
             isDragging && "opacity-60 duration-100"
        )}></div>
        <div className={clsx(
            "absolute -bottom-8 left-20 w-72 h-72 bg-neon-blue rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-4000",
             isDragging && "opacity-60 duration-100"
        )}></div>
        
        {/* Iridescent Mesh Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-20 bg-[length:200%_200%] animate-flow"></div>
      </div>

      {/* --- GLASS FOREGROUND CONTAINER --- */}
      <div className={clsx(
        "relative z-10 w-full h-full rounded-[20px] flex flex-col items-center justify-center gap-5 border transition-all duration-500",
        "bg-white/5 backdrop-blur-3xl", // Heavy blur for soft glass feel
        isDragging ? "border-neon-cyan/50 bg-white/10" : "border-white/10 hover:border-white/20"
      )}>
        
        {/* Icon Circle */}
        <div className="relative">
            {/* Outer Glow Ring */}
            <div className={clsx(
                "absolute inset-0 rounded-full blur-md transition-all duration-500",
                isDragging ? "bg-neon-cyan/40 scale-125" : "bg-neon-purple/20 group-hover:bg-neon-cyan/20 scale-100"
            )}></div>
            
            <div className={clsx(
                "w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-500 border border-white/20",
                isDragging ? "bg-black/40 scale-110 border-neon-cyan" : "bg-black/20 group-hover:bg-black/30"
            )}>
                {isLoading ? (
                    <Loader2 className="w-10 h-10 text-neon-cyan animate-spin" />
                ) : (
                    <Upload className={clsx(
                        "w-10 h-10 transition-colors duration-300",
                        isDragging ? "text-neon-cyan" : "text-gray-300 group-hover:text-white"
                    )} />
                )}
            </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-1.5 text-center px-4">
          <h3 className={clsx(
              "text-xl font-medium tracking-tight transition-colors duration-300 flex items-center gap-2",
              isDragging ? "text-neon-cyan" : "text-white"
          )}>
            {isLoading ? "Simulating Reality..." : "Upload Source"}
            {!isLoading && <Sparkles size={14} className={clsx("transition-opacity", isDragging ? "opacity-100 text-neon-cyan" : "opacity-0 group-hover:opacity-50 text-neon-purple")} />}
          </h3>
          <p className="text-sm text-gray-400 font-light max-w-xs">
            {isLoading ? "Analyzing Y86-64 instructions..." : "Drop your .yo file here to initialize the neural interface"}
          </p>
        </div>

        {/* Bottom Status Bar decoration */}
        <div className="absolute bottom-6 flex gap-2">
            <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors duration-500", isDragging ? "bg-neon-cyan" : "bg-gray-700 group-hover:bg-neon-cyan/50")}></div>
            <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors duration-500 delay-75", isDragging ? "bg-neon-cyan" : "bg-gray-700 group-hover:bg-neon-cyan/50")}></div>
            <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors duration-500 delay-150", isDragging ? "bg-neon-cyan" : "bg-gray-700 group-hover:bg-neon-cyan/50")}></div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;