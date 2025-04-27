
import React from 'react';
import { Button } from "@/components/ui/button";
import { Hand, MousePointer, ZoomIn, ZoomOut } from 'lucide-react';

export const Toolbar = () => {
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-full px-2 py-1 flex gap-1">
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <Hand className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <MousePointer className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
