import React from 'react';

interface FuturisticLoaderProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function FuturisticLoader({ isVisible, onComplete }: FuturisticLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-blue-400 rounded-full opacity-20 animate-pulse"
            style={{
              width: '3px',
              height: '3px',
              left: `${20 + (i * 5)}%`,
              top: `${10 + (i * 6)}%`,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Main loading container */}
      <div className="relative z-10 text-center">
        {/* Central loading ring */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
          
          {/* Spinning ring 1 */}
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
          
          {/* Spinning ring 2 - reverse */}
          <div 
            className="absolute inset-4 rounded-full border-2 border-transparent border-r-cyan-400 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          ></div>
          
          {/* Inner pulse */}
          <div className="absolute inset-8 rounded-full bg-blue-500/20 animate-pulse"></div>
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
        </div>

        {/* Loading text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            <span className="inline-block animate-pulse">Initializing</span>
            <span className="inline-block animate-pulse ml-2" style={{ animationDelay: '0.5s' }}>CABCO</span>
            <span className="inline-block animate-pulse ml-2" style={{ animationDelay: '1s' }}>System</span>
          </h2>
          
          {/* Progress bar */}
          <div className="w-64 h-1 bg-slate-700 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Status text */}
          <p className="text-blue-200 text-sm animate-pulse">Loading Maps & Vehicle Data...</p>
        </div>

        {/* Simple background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
            {[...Array(64)].map((_, i) => (
              <div key={i} className="border border-blue-400 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-400"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-400"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-400"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-400"></div>


    </div>
  );
}