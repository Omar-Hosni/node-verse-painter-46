import React, { useState, useEffect } from 'react';

interface SimpleLoadingScreenProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  showLogo?: boolean;
}

const SimpleLoadingScreen: React.FC<SimpleLoadingScreenProps> = ({ 
  message = "Loading...", 
  size = 'medium',
  showLogo = true
}) => {
  const [dots, setDots] = useState('');

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    small: {
      container: 'space-y-4',
      spinner: 'w-8 h-8',
      logo: 'h-5',
      text: 'text-sm'
    },
    medium: {
      container: 'space-y-6',
      spinner: 'w-12 h-12',
      logo: 'h-6',
      text: 'text-base'
    },
    large: {
      container: 'space-y-8',
      spinner: 'w-16 h-16',
      logo: 'h-8',
      text: 'text-lg'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0D0D0D] text-white">
      {/* App Logo */}
      {showLogo && (
        <div className="mb-6">
          <img
            src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
            alt="App Logo"
            className="h-5 w-auto opacity-90"
          />
        </div>
      )}

      {/* Simple Progress Bar */}
      <div className="w-48 h-1 bg-[#1d1d1d] rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
};

export default SimpleLoadingScreen;