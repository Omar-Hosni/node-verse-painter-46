
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

export interface ShareProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectLink?: string;
}

export const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({ 
  isOpen, 
  onClose, 
  projectLink = window.location.href 
}) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(projectLink);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] text-white border-[#333]">
        <DialogHeader>
          <DialogTitle className="text-white">Share Project</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share this link with others to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 mt-4">
          <Input
            value={projectLink}
            readOnly
            className="bg-[#252525] border-[#333] text-gray-300"
          />
          <Button variant="outline" size="icon" onClick={handleCopyLink} className="border-[#333] text-gray-300 hover:text-white hover:bg-[#252525]">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="border-[#333] text-gray-300 hover:text-white hover:bg-[#252525]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
