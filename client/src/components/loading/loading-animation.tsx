import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cabcoLogo from '@assets/CABCO-LOGO_1752230053005.webp';

interface LoadingAnimationProps {
  onComplete: () => void;
}

export default function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [showLogo, setShowLogo] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start logo animation after brief delay
    const logoTimer = setTimeout(() => setShowLogo(true), 300);

    // Progress animation
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          // Complete loading and navigate to autocab interface
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      clearTimeout(logoTimer);
      clearInterval(progressTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Canterbury Map Background with Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.8) 100%),
            url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f3f4f6;stop-opacity:0.3"/><stop offset="100%" style="stop-color:%239ca3af;stop-opacity:0.2"/></linearGradient></defs><g fill="none" stroke="url(%23mapGradient)" stroke-width="2" opacity="0.4"><path d="M100 100 Q200 150 300 100 T500 120 L600 80 Q700 100 750 150"/><path d="M50 200 Q150 250 250 180 T450 200 L550 160 Q650 180 720 220"/><path d="M80 300 Q180 350 280 280 T480 300 L580 260 Q680 280 740 330"/><path d="M120 400 Q220 450 320 380 T520 400 L620 360 Q720 380 780 430"/><circle cx="300" cy="200" r="8" fill="%23fbbf24" opacity="0.6"/><circle cx="450" cy="300" r="6" fill="%23f59e0b" opacity="0.5"/><circle cx="200" cy="350" r="4" fill="%23d97706" opacity="0.4"/><text x="300" y="190" font-family="Arial" font-size="12" fill="%23374151" opacity="0.3" text-anchor="middle">Canterbury</text></g></svg>')
          `
        }}
      />

      {/* Animated geometric patterns */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-yellow-400/20"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              left: '50%',
              top: '50%',
              marginLeft: `${-(100 + i * 50)}px`,
              marginTop: `${-(100 + i * 50)}px`,
            }}
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* CABCO Logo with Animation */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                type: "spring",
                stiffness: 100,
                damping: 20
              }}
              className="mb-12"
            >
              <div className="relative">
                {/* Glow effect behind logo */}
                <div 
                  className="absolute inset-0 rounded-full blur-xl opacity-30"
                  style={{
                    background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)',
                    transform: 'scale(1.5)'
                  }}
                />
                
                {/* Main logo */}
                <img 
                  src={cabcoLogo} 
                  alt="CABCO Canterbury Taxis" 
                  className="w-48 h-48 md:w-60 md:h-60 relative z-10 drop-shadow-2xl"
                />
                
                {/* Rotating ring around logo */}
                <motion.div
                  className="absolute inset-0 border-4 border-transparent border-t-yellow-400 border-r-yellow-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ transform: 'scale(1.1)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading text and progress */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center space-y-6"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            CABCO
            <span className="block text-2xl md:text-3xl font-light text-yellow-400 mt-2">
              Canterbury Taxis
            </span>
          </h1>
          
          <p className="text-xl text-gray-200 max-w-md mx-auto">
            Loading Autocab Dispatch System...
          </p>

          {/* Progress bar */}
          <div className="w-80 max-w-sm mx-auto">
            <div className="bg-black/30 backdrop-blur-sm rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-sm text-gray-300 mt-2 text-center">
              {progress}% Complete
            </p>
          </div>
        </motion.div>

        {/* Footer with system info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 text-center"
        >
          <p className="text-sm text-gray-400">
            Professional Taxi Services • Canterbury, UK
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Powered by AUTOCAB API • Real-time Vehicle Tracking
          </p>
        </motion.div>

        {/* Floating particles animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -100],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}