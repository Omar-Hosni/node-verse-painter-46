import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
    message?: string;
    showProgress?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = "Loading project...",
    showProgress = true
}) => {
    const [dots, setDots] = useState('');
    const [progress, setProgress] = useState(0);

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

    // Simulated progress for better UX
    useEffect(() => {
        if (!showProgress) return;

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev; // Stop at 90% until actual loading completes
                return prev + Math.random() * 15;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [showProgress]);

    return (
        <div className="flex items-center justify-center h-screen bg-[#121212] text-white">
            <div className="flex flex-col items-center space-y-8">
                {/* App Logo */}
                <div className="flex items-center space-x-3">
                    <img
                        src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                        alt="App Logo"
                        className="h-8 w-auto"
                    />
                    <span className="text-xl font-semibold text-white">Nover</span>
                </div>

                {/* Loading Spinner */}
                <div className="relative">
                    {/* Outer ring */}
                    <div className="w-16 h-16 border-2 border-[#1d1d1d] rounded-full"></div>

                    {/* Spinning ring */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#007AFF] rounded-full animate-spin"></div>

                    {/* Inner dot */}
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#007AFF] rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* Loading Message */}
                <div className="text-center space-y-2">
                    <p className="text-[#9e9e9e] text-sm font-medium">
                        {message}{dots}
                    </p>

                    {/* Progress Bar */}
                    {showProgress && (
                        <div className="w-64 h-1 bg-[#1d1d1d] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Loading Steps */}
                <div className="text-center space-y-1">
                    <div className="flex items-center justify-center space-x-2 text-xs text-[#666666]">
                        <div className="w-1 h-1 bg-[#007AFF] rounded-full animate-pulse"></div>
                        <span>Initializing workspace</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-xs text-[#666666]">
                        <div className="w-1 h-1 bg-[#333333] rounded-full"></div>
                        <span>Loading project data</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-xs text-[#666666]">
                        <div className="w-1 h-1 bg-[#333333] rounded-full"></div>
                        <span>Setting up canvas</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;