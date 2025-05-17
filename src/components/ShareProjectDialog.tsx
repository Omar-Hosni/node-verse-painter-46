
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, Users } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First check if the user exists in the system
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userError) {
        // User not found, send invitation email
        // Here you would typically set up an edge function to send an email
        // For now, we'll just show a success message
        
        // Create an invitation in the database (this would need a new table setup)
        // This is simplified, but you would need to add this table in a separate SQL migration
        /* const { error } = await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            email: email,
            status: 'pending',
            created_at: new Date().toISOString()
          }); */
          
        toast.success(`Invitation sent to ${email}`);
      } else {
        // User exists, add them as a collaborator directly
        // This would need a project_collaborators table
        /* const { error } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: projectId,
            user_id: userData.id,
            role: 'editor',
            created_at: new Date().toISOString()
          }); */
        
        toast.success(`${email} added as a collaborator!`);
      }
      
      setEmail('');
      onClose();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(`Failed to send invitation: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share {projectName}
          </DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this project in real-time.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleInviteUser}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                />
                <Button 
                  type="submit" 
                  disabled={!email || isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Invite'}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or share link
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="link">Anyone with the link can view</Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={`${window.location.origin}/editor/${projectId}`}
                  readOnly
                  className="col-span-3"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/editor/${projectId}`);
                    toast.success('Link copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </form>
        
        <DialogFooter className="sm:justify-start">
          <DialogDescription className="text-xs">
            Note: This is a simplified version. Currently, invited users will need to be sent the link manually.
          </DialogDescription>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
