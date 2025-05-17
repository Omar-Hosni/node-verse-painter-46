
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, LogOut } from 'lucide-react';
import { CreditsDisplay } from './CreditsDisplay';
import { CollaboratorsDisplay } from './CollaboratorsDisplay';

interface AppHeaderProps {
  projectName?: string;
  onSave?: () => void;
  onBackToDashboard?: () => void;
  showLogoutButton?: boolean;
  onLogout?: () => void;
}

export const AppHeader = ({ 
  projectName,
  onSave,
  onBackToDashboard,
  showLogoutButton,
  onLogout
}: AppHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 h-14 bg-[#111111] border-b border-[#2A2A2A] py-[16px]">
      <div className="flex items-center gap-2">
        {onBackToDashboard && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackToDashboard}
            className="gap-1 text-gray-400 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
        )}
        <div className="flex items-center">
          <img src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png" alt="App Logo" className="h-4 w-auto" />
          {projectName && (
            <span className="ml-2 text-sm font-medium text-gray-200">{projectName}</span>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <CollaboratorsDisplay />
        <CreditsDisplay />
        
        {showLogoutButton && onLogout && (
          <Button 
            variant="outline" 
            onClick={onLogout}
            className="gap-1 border-[#333] bg-[#1A1A1A] text-gray-300"
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
        {onSave && (
          <Button 
            onClick={onSave}
            className="gap-1 rounded-full bg-blue-600 text-white px-6 text-sm font-normal"
          >
            <Save className="h-4 w-4" />
            Save Project
          </Button>
        )}
        {!onSave && (
          <Button className="rounded-full bg-blue-600 text-white px-6 text-sm font-normal">
            Generate Image
          </Button>
        )}
      </div>
    </header>
  );
};
