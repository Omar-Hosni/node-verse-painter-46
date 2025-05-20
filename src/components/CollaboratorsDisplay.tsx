
import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const CollaboratorsDisplay = () => {
  const collaborators = useCanvasStore(state => state.collaborators);
  
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  // Show up to 5 collaborators, additional ones will be shown as a count
  const visibleCollaborators = collaborators.slice(0, 5);
  const remainingCount = collaborators.length - 5;
  
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {visibleCollaborators.map((collaborator) => {
        const initials = getInitials(collaborator);
        
        return (
          <TooltipProvider key={collaborator.id} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-gray-800 bg-gray-700">
                  <AvatarImage src={collaborator.avatar_url || undefined} alt={collaborator.email} />
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {collaborator.first_name 
                    ? `${collaborator.first_name} ${collaborator.last_name || ''}` 
                    : collaborator.email}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {remainingCount > 0 && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-700 text-xs font-medium text-white border-2 border-gray-800">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingCount} more collaborator{remainingCount !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

// Helper function to get initials from name
function getInitials(collaborator: { first_name?: string, last_name?: string, email: string }): string {
  if (collaborator.first_name && collaborator.last_name) {
    return `${collaborator.first_name[0]}${collaborator.last_name[0]}`.toUpperCase();
  }
  
  if (collaborator.first_name) {
    return collaborator.first_name[0].toUpperCase();
  }
  
  // If no name, use the first letter of the email
  return collaborator.email[0].toUpperCase();
}
