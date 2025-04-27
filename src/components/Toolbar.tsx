
import React from 'react';
import { Button } from "@/components/ui/button";
import { hand, "mouse-pointer", "zoom-in", "zoom-out" } from 'lucide-react';

export const Toolbar = () => {
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-full px-2 py-1 flex gap-1">
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <hand className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <mouse-pointer className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <zoom-in className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="rounded-full hover:bg-gray-700"
      >
        <zoom-out className="h-4 w-4" />
      </Button>
    </div>
  );
};
