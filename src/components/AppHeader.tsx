
import React from 'react';
import { Button } from "@/components/ui/button";

export const AppHeader = () => {
  return (
    <header className="flex items-center justify-between px-4 h-14 bg-sidebar border-b border-field py-[16px]">
      <div className="flex items-center">
        <img 
          src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png" 
          alt="App Logo" 
          className="h-4 w-auto" 
        />
      </div>
      <Button className="rounded-full bg-primary hover:bg-primary/90 text-white px-6 text-sm">
        Generate Image
      </Button>
    </header>
  );
};
