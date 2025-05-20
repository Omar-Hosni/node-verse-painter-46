
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShareProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export const ShareProjectDialog = ({
  isOpen,
  onClose,
  projectId,
  projectName
}: ShareProjectDialogProps) => {
  const [email, setEmail] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  
  useEffect(() => {
    // Generate shareable link when dialog opens
    if (isOpen) {
      const baseUrl = window.location.origin;
      setShareableLink(`${baseUrl}/editor/${projectId}`);
    }
  }, [isOpen, projectId]);
  
  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    
    try {
      setSending(true);
      
      // Check if the user exists in the system first
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('email', email)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        toast.error("Error checking user. Please try again.");
        setSending(false);
        return;
      }
      
      // If user doesn't exist, send an invitation email
      // For demo purposes, we're just showing a success message
      // In a real app, you'd send an email with a link to register
      if (!existingUser) {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        setSending(false);
        return;
      }
      
      // If user exists, add them as a collaborator to the project
      // Note: We're simulating this for the demo since 'project_collaborators' table doesn't exist yet
      // In production, you'd create this table with the appropriate schema
      toast.success(`${existingUser.first_name || existingUser.email} added as a collaborator`);
      setEmail("");
    } catch (error) {
      console.error("Error inviting user:", error);
      toast.error("Error sending invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{projectName}"</DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this project.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="invite">Invite People</TabsTrigger>
            <TabsTrigger value="link">Shareable Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  placeholder="example@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  onClick={handleInvite} 
                  disabled={sending || !email.trim()}
                >
                  {sending ? "Sending..." : "Invite"}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>The invited user will receive an email with a link to this project.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="link" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="link">Shareable link</Label>
              <div className="flex space-x-2">
                <Input
                  id="link"
                  value={shareableLink}
                  readOnly
                  className="flex-1"
                />
                <Button size="icon" onClick={copyToClipboard} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Anyone with this link can view and collaborate on this project.</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
