import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cabcoLogo from '@assets/CABCO-LOGO_1752229527562.webp';

interface CabcoLoadingAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const CabcoLoadingAnimation: React.FC<CabcoLoadingAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const [stage, setStage] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const timeline = [
      { delay: 0, action: () => setStage(1) },      // Show blueprint background
      { delay: 1000, action: () => setStage(2) },  // Start building circle
      { delay: 2000, action: () => setStage(3) },  // Add CAB letters
      { delay: 3000, action: () => setStage(4) },  // Add CO letters
      { delay: 3500, action: () => setShowLogo(true) }, // Show complete logo
      { delay: 4500, action: () => onComplete?.() } // Complete animation
    ];

    const timers = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.03) 0%, transparent 50%),
            linear-gradient(135deg, #000000 0%, #111111 100%)
          `
        }}
      >
        {/* Realistic City Map Background */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" className="w-full h-full">
            <defs>
              <pattern id="city-map" patternUnits="userSpaceOnUse" width="400" height="400">
                {/* Realistic street network - white lines on black background */}
                
                {/* Major highways and arterial roads */}
                <path d="M0,200 L400,200" stroke="#ffffff" strokeWidth="1.2" opacity="0.6"/>
                <path d="M200,0 L200,400" stroke="#ffffff" strokeWidth="1.0" opacity="0.6"/>
                <path d="M0,100 L400,120" stroke="#ffffff" strokeWidth="0.8" opacity="0.5"/>
                <path d="M0,300 L400,280" stroke="#ffffff" strokeWidth="0.8" opacity="0.5"/>
                <path d="M100,0 L120,400" stroke="#ffffff" strokeWidth="0.8" opacity="0.5"/>
                <path d="M300,0 L280,400" stroke="#ffffff" strokeWidth="0.8" opacity="0.5"/>
                
                {/* Ring road system */}
                <circle cx="200" cy="200" r="120" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5"/>
                <circle cx="200" cy="200" r="80" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.4"/>
                
                {/* Secondary street grid */}
                <path d="M0,50 L400,50" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M0,150 L400,150" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M0,250 L400,250" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M0,350 L400,350" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M50,0 L50,400" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M150,0 L150,400" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M250,0 L250,400" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                <path d="M350,0 L350,400" stroke="#ffffff" strokeWidth="0.4" opacity="0.4"/>
                
                {/* Curved residential streets */}
                <path d="M80,80 Q120,100 160,80 Q200,60 240,80" stroke="#ffffff" strokeWidth="0.3" opacity="0.35"/>
                <path d="M80,320 Q120,300 160,320 Q200,340 240,320" stroke="#ffffff" strokeWidth="0.3" opacity="0.35"/>
                <path d="M320,80 Q300,120 320,160 Q340,200 320,240" stroke="#ffffff" strokeWidth="0.3" opacity="0.35"/>
                <path d="M80,80 Q100,120 80,160 Q60,200 80,240" stroke="#ffffff" strokeWidth="0.3" opacity="0.35"/>
                
                {/* Small local streets */}
                <path d="M25,25 L375,375" stroke="#ffffff" strokeWidth="0.25" opacity="0.3"/>
                <path d="M375,25 L25,375" stroke="#ffffff" strokeWidth="0.25" opacity="0.3"/>
                <path d="M100,160 Q140,180 180,160 Q220,140 260,160" stroke="#ffffff" strokeWidth="0.25" opacity="0.3"/>
                <path d="M100,240 Q140,220 180,240 Q220,260 260,240" stroke="#ffffff" strokeWidth="0.25" opacity="0.3"/>
                
                {/* Bridges and overpasses */}
                <path d="M180,190 L220,210" stroke="#ffffff" strokeWidth="0.6" opacity="0.6"/>
                <path d="M190,180 L210,220" stroke="#ffffff" strokeWidth="0.6" opacity="0.6"/>
                
                {/* City blocks representation */}
                <rect x="60" y="60" width="30" height="30" fill="none" stroke="#ffffff" strokeWidth="0.2" opacity="0.3"/>
                <rect x="110" y="110" width="40" height="20" fill="none" stroke="#ffffff" strokeWidth="0.2" opacity="0.3"/>
                <rect x="260" y="260" width="35" height="35" fill="none" stroke="#ffffff" strokeWidth="0.2" opacity="0.3"/>
                <rect x="310" y="110" width="25" height="45" fill="none" stroke="#ffffff" strokeWidth="0.2" opacity="0.3"/>
                
                {/* GPS Vehicle Tracking Points - Realistic pulsing */}
                <circle cx="120" cy="180" r="2" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="280" cy="120" r="2" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="2;3.5;2" dur="1.8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="160" cy="320" r="1.8" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.8;3.2;1.8" dur="2.1s" repeatCount="indefinite"/>
                </circle>
                <circle cx="340" cy="280" r="1.8" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.8;3;1.8" dur="1.6s" repeatCount="indefinite"/>
                </circle>
                <circle cx="80" cy="240" r="1.5" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="2.3s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.5;2.8;1.5" dur="2.3s" repeatCount="indefinite"/>
                </circle>
                <circle cx="240" cy="80" r="1.5" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.9s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.5;2.5;1.5" dur="1.9s" repeatCount="indefinite"/>
                </circle>
                <circle cx="200" cy="360" r="1.3" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.4s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.3;2.2;1.3" dur="2.4s" repeatCount="indefinite"/>
                </circle>
                <circle cx="360" cy="160" r="1.3" fill="#ef4444" opacity="1">
                  <animate attributeName="opacity" values="1;0.5;1" dur="1.7s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="1.3;2.4;1.3" dur="1.7s" repeatCount="indefinite"/>
                </circle>
                
                {/* Moving GPS signals - animated paths */}
                <path d="M100,100 Q150,120 200,100 Q250,80 300,100" stroke="#ef4444" strokeWidth="0.8" opacity="0.6">
                  <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0;25,25;0,50" dur="4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite"/>
                </path>
                <path d="M100,300 Q120,250 100,200 Q80,150 100,100" stroke="#ef4444" strokeWidth="0.6" opacity="0.5">
                  <animate attributeName="stroke-dasharray" values="0,40;20,20;40,0;20,20;0,40" dur="3.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" repeatCount="indefinite"/>
                </path>
                
                {/* Taxi pickup point (yellow) */}
                <g transform="translate(160,160)">
                  <rect x="-4" y="-3" width="8" height="6" fill="#fbbf24" rx="1" opacity="0.9">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="-3" y="-2" width="6" height="4" fill="#fef3c7" rx="0.5"/>
                  <text x="0" y="1" fontSize="2.5" textAnchor="middle" fill="#92400e" fontWeight="bold">🚖</text>
                </g>
                
                {/* Via point flags (blue) */}
                <g transform="translate(220,140)">
                  <rect x="-0.5" y="-8" width="1" height="10" fill="#1e40af"/>
                  <polygon points="-0.5,-8 7,-6 -0.5,-4" fill="#3b82f6">
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="1.8s" repeatCount="indefinite"/>
                  </polygon>
                  <rect x="1" y="-7" width="4" height="2" fill="#ffffff" opacity="0.6"/>
                </g>
                
                <g transform="translate(180,260)">
                  <rect x="-0.5" y="-8" width="1" height="10" fill="#1e40af"/>
                  <polygon points="-0.5,-8 7,-6 -0.5,-4" fill="#3b82f6">
                    <animate attributeName="opacity" values="1;0.8;1" dur="2.2s" repeatCount="indefinite"/>
                  </polygon>
                  <rect x="1" y="-7" width="4" height="2" fill="#ffffff" opacity="0.6"/>
                </g>
                
                {/* Destination finish flag (green checkered) */}
                <g transform="translate(280,220)">
                  <rect x="-0.5" y="-10" width="1" height="12" fill="#166534"/>
                  <polygon points="-0.5,-10 8,-8 -0.5,-6" fill="#22c55e">
                    <animate attributeName="opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite"/>
                  </polygon>
                  {/* Checkered pattern */}
                  <rect x="1" y="-9" width="2" height="1" fill="#ffffff"/>
                  <rect x="5" y="-9" width="2" height="1" fill="#ffffff"/>
                  <rect x="3" y="-8" width="2" height="1" fill="#ffffff"/>
                  <rect x="1" y="-7" width="2" height="1" fill="#ffffff"/>
                  <rect x="5" y="-7" width="2" height="1" fill="#ffffff"/>
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#city-map)"/>
          </svg>
        </div>

        {/* Main Animation Container */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Logo Construction Area */}
          <div className="relative w-48 h-48 mb-8">
            
            {/* Outer Circle - Yellow Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-8 border-yellow-400"
              initial={{ scale: 0, rotate: -180 }}
              animate={stage >= 2 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
              transition={{ duration: 1.2, type: "spring", stiffness: 100 }}
            />

            {/* Middle Circle - Second Yellow Ring */}
            <motion.div
              className="absolute inset-2 rounded-full border-4 border-yellow-400"
              initial={{ scale: 0, rotate: 180 }}
              animate={stage >= 2 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 180 }}
              transition={{ duration: 1.0, type: "spring", stiffness: 100, delay: 0.2 }}
            />

            {/* Inner Circle Background */}
            <motion.div
              className="absolute inset-6 rounded-full bg-black/90"
              initial={{ scale: 0 }}
              animate={stage >= 2 ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />

            {/* CAB Letters */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={stage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <div className="text-white font-bold text-5xl tracking-wider">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={stage >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  C
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={stage >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  A
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={stage >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  B
                </motion.span>
              </div>
            </motion.div>

            {/* CO Letters */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={stage >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, type: "spring" }}
            >
              <div className="text-white font-bold text-3xl tracking-wider">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={stage >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  C
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={stage >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  O
                </motion.span>
              </div>
            </motion.div>

            {/* Complete Logo Reveal */}
            {showLogo && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                <img 
                  src={cabcoLogo} 
                  alt="CABCO Logo" 
                  className="w-full h-full object-contain"
                />
              </motion.div>
            )}
          </div>

          {/* Loading Text */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={stage >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <motion.h2 
              className="text-3xl font-bold text-white mb-2"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              CABCO
            </motion.h2>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            className="mt-8 w-64 h-1 bg-slate-700 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={stage >= 1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-yellow-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(stage * 25, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <p className="text-slate-400 text-sm">
              Loading Dispatch System...
            </p>
          </motion.div>
        </div>

        {/* GPS Signal Decorative Elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
        <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-red-400 rounded-full animate-ping" />
        <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-red-300 rounded-full animate-pulse" />
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-red-400 rounded-full animate-ping" />
      </motion.div>
    </AnimatePresence>
  );
};