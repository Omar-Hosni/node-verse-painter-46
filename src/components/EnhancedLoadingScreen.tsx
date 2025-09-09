import React, { useState, useEffect } from 'react';

interface LoadingStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface EnhancedLoadingScreenProps {
  steps?: LoadingStep[];
  currentStep?: string;
  message?: string;
  progress?: number;
}

const EnhancedLoadingScreen: React.FC<EnhancedLoadingScreenProps> = ({ 
  steps,
  currentStep,
  message = "Loading project...",
  progress
}) => {
  const [dots, setDots] = useState('');
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showPanels, setShowPanels] = useState(false);

  // Default loading steps
  const defaultSteps: LoadingStep[] = [
    { id: 'init', label: 'Initializing workspace', completed: false, active: true },
    { id: 'project', label: 'Loading project data', completed: false, active: false },
    { id: 'canvas', label: 'Setting up canvas', completed: false, active: false },
  ];

  const loadingSteps = steps || defaultSteps;

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

  // Animate progress bar
  useEffect(() => {
    if (progress !== undefined) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // Auto-progress simulation if no explicit progress provided
  useEffect(() => {
    if (progress === undefined) {
      const interval = setInterval(() => {
        setAnimatedProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [progress]);

  // Trigger panel animations after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPanels(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="h-screen bg-[#121212] text-white flex flex-col">
        {/* Header */}
        <div className="h-[55px] bg-[#0d0d0d] border-b border-[#1d1d1d]"></div>
        
        {/* Main Content Area */}
        <div className="flex flex-1">
          {/* Left Sidebar - Slides in from left */}
          <div 
            className={`w-[265px] bg-[#0d0d0d] border-r border-[#1d1d1d] transition-transform duration-300 ease-out ${
              showPanels ? 'translate-x-0' : '-translate-x-full'
            }`}
          ></div>
          
          {/* Center Canvas Area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* App Logo */}
            <div className="mb-6">
              <img
                src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                alt="App Logo"
                className="h-6 w-auto opacity-90"
              />
            </div>

            {/* Progress Bar */}
            <div className="w-64 h-1 bg-[#1d1d1d] rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${animatedProgress}%`
                }}
              />
            </div>
          </div>
          
          {/* Right Sidebar - Slides in from right */}
          <div 
            className={`w-[265px] bg-[#0d0d0d] border-l border-[#1d1d1d] transition-transform duration-300 ease-out ${
              showPanels ? 'translate-x-0' : 'translate-x-full'
            }`}
          ></div>
        </div>
      </div>
    </>
  );
};

export default EnhancedLoadingScreen;