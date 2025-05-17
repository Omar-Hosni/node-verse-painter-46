
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCanvasStore } from '@/store/useCanvasStore';
import { Collaborator } from '@/store/types';

export const CollaboratorsDisplay: React.FC = () => {
  const collaborators = useCanvasStore(state => state.collaborators);

  // Don't display anything if there are no collaborators
  if (!collaborators.length) return null;
  
  return (
    <div className="flex -space-x-2">
      <TooltipProvider>
        {collaborators.map((collaborator) => (
          <Tooltip key={collaborator.id}>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Avatar className="h-8 w-8 border-2 border-[#111111]">
                  {collaborator.avatar_url ? (
                    <AvatarImage src={collaborator.avatar_url} alt={collaborator.email} />
                  ) : null}
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {getInitials(collaborator)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {collaborator.first_name && collaborator.last_name
                ? `${collaborator.first_name} ${collaborator.last_name}`
                : collaborator.email}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

// Helper function to get initials
function getInitials(collaborator: Collaborator): string {
  if (collaborator.first_name && collaborator.last_name) {
    return `${collaborator.first_name[0]}${collaborator.last_name[0]}`.toUpperCase();
  }
  return collaborator.email.substring(0, 2).toUpperCase();
}
