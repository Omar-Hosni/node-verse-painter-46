
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Node, Edge } from '@xyflow/react';
import { UserCredits, UserSubscription } from './types';

export const saveProject = async (
  name: string, 
  description: string = '', 
  nodes: Node[], 
  edges: Edge[]
): Promise<string | null> => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to save a project');
      return null;
    }

    // Get current canvas state and convert to a format compatible with Supabase's JSON type
    // Serializable canvas data that can be stored as JSON
    const canvasData = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };

    // Save to Supabase
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        name,
        description,
        canvas_data: canvasData
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving project:', error);
      toast.error(`Failed to save project: ${error.message}`);
      return null;
    }

    toast.success('Project saved successfully!');
    return data.id;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

export const updateProject = async (
  projectId: string,
  nodes: Node[],
  edges: Edge[]
): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to save a project');
      return false;
    }

    // Convert to serializable JSON
    const canvasData = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    
    const { error } = await supabase
      .from('projects')
      .update({
        canvas_data: canvasData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) {
      toast.error(`Failed to save project: ${error.message}`);
      return false;
    }
    
    toast.success('Project saved successfully!');
    return true;
  } catch (error: any) {
    console.error('Error saving project:', error);
    toast.error(`Failed to save: ${error.message}`);
    return false;
  }
};

export const loadProject = async (
  projectId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setSelectedNode: (node: Node | null) => void,
  resetHistoryState: () => void,
  resetNodeIdCounter: (nodes: Node[]) => void
): Promise<boolean> => {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to load a project');
      return false;
    }

    // Fetch project from Supabase
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error loading project:', error);
      toast.error(`Failed to load project: ${error.message}`);
      return false;
    }

    if (!data || !data.canvas_data) {
      toast.error('Project data is invalid');
      return false;
    }

    // Parse canvas data from JSON
    const canvasData = data.canvas_data;
    
    // Ensure we have nodes and edges
    if (!canvasData.nodes || !canvasData.edges) {
      toast.error('Project data is corrupted or invalid');
      return false;
    }

    // Reset nodeIdCounter to avoid ID conflicts
    resetNodeIdCounter(canvasData.nodes);

    // Load canvas state
    setNodes(canvasData.nodes);
    setEdges(canvasData.edges);
    setSelectedNode(null);
    resetHistoryState(canvasData.nodes, canvasData.edges);

    toast.success('Project loaded successfully!');
    return true;
  } catch (error) {
    console.error('Error loading project:', error);
    toast.error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

export const fetchUserCredits = async (): Promise<number | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching credits:', error);
      return null;
    }

    return data?.credits_balance || 0;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }
};

export const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data as UserSubscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

export const useCreditsForGeneration = async (credits: number | null): Promise<boolean> => {
  try {
    if (!credits || credits < 1) {
      return false;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    // Deduct 1 credit
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ credits_balance: credits - 1 })
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Failed to update credits:', updateError);
      return false;
    }

    // Record transaction
    await supabase
      .from('credits_transactions')
      .insert({
        user_id: session.user.id,
        amount: -1,
        description: 'Image generation'
      });
    
    return true;
  } catch (error) {
    console.error('Error using credits:', error);
    return false;
  }
};
