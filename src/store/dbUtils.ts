
import { supabase } from '@/integrations/supabase/client';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { UserSubscription, UserCredits, Json } from './types';

// Save a project to the database
export const saveProject = async (
  name: string,
  description: string | undefined,
  nodes: Node[],
  edges: Edge[]
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to save a project');
      return null;
    }

    // Convert to serializable JSON
    const canvasData = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        canvas_data: canvasData,
        user_id: user.id,
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
  } catch (error: any) {
    console.error('Error saving project:', error);
    toast.error(`Failed to save: ${error.message}`);
    return null;
  }
};

// Load a project from the database
export const loadProject = async (
  projectId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setSelectedNode: (node: Node | null) => void,
  setHistory: (history: { nodes: Node[], edges: Edge[] }) => void,
  resetNodeIdCounterFunc: () => void
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('canvas_data')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error loading project:', error);
      toast.error(`Failed to load project: ${error.message}`);
      return false;
    }

    if (data && data.canvas_data) {
      // Cast safely using type assertion after checking required properties
      // Fix TypeScript error by correctly casting the JSON data
      const canvasData = data.canvas_data as unknown as { nodes: Node[], edges: Edge[] };
      
      if (typeof canvasData !== 'object' || !canvasData || !('nodes' in canvasData) || !('edges' in canvasData)) {
        console.error('Invalid canvas data format:', canvasData);
        toast.error('Invalid canvas data format');
        return false;
      }

      const nodes = canvasData.nodes;
      const edges = canvasData.edges;
      
      // Reset node ID counter to avoid duplicate IDs
      resetNodeIdCounterFunc();
      
      // Set the canvas data
      setNodes(nodes);
      setEdges(edges);
      setSelectedNode(null);
      setHistory({ nodes, edges });
      
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error loading project:', error);
    toast.error(`Failed to load project: ${error.message}`);
    return false;
  }
};

// Fetch user credits
export const fetchUserCredits = async (): Promise<number | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Simulate credits fetch for now
    return 100; // Default credits
  } catch (error) {
    console.error('Error fetching credits:', error);
    return null;
  }
};

// Fetch user subscription
export const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Simulate subscription fetch for now
    return { 
      tier: 'free',
      status: 'active' 
    }; // Default subscription
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};

// Use credits for generation
export const useCreditsForGeneration = async (currentCredits: number | null): Promise<boolean> => {
  // If no credits or less than 1, return false
  if (!currentCredits || currentCredits < 1) {
    toast.error('Not enough credits for generation');
    return false;
  }

  // In a real implementation, we would update the user's credits in the database here
  // For now, we'll just return true to indicate success
  return true;
};
