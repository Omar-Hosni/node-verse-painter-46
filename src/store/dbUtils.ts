
import { supabase } from '@/integrations/supabase/client';
import { Edge, Node } from '@xyflow/react';
import { Json, UserCredits, UserSubscription } from './types';
import { toast } from 'sonner';

// This is a mocked implementation since we don't have actual database tables
// In a real app, these functions would interact with Supabase properly

// Save a new project to the database
export const saveProject = async (
  name: string, 
  description: string | undefined, 
  nodes: Node[], 
  edges: Edge[]
): Promise<string | null> => {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to save a project');
      return null;
    }

    // Prepare canvas data - convert complex objects to serializable JSON
    const canvasData = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };

    // Insert project into database
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name || 'Untitled Project',
        description: description || '',
        user_id: session.user.id,
        canvas_data: canvasData as unknown as Json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    toast.error(`Failed to save project: ${error.message}`);
    return null;
  }
};

// Load a project from the database
export const loadProject = async (
  projectId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setSelectedNode: (node: Node | null) => void,
  setHistory: (nodes: Node[], edges: Edge[]) => void,
  resetNodeIdCounter: (nodes: Node[]) => void
): Promise<boolean> => {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to load a project');
      return false;
    }

    // Mock implementation - in a real app, this would fetch from the database
    const { data, error } = await supabase
      .from('projects')
      .select('canvas_data')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error loading project:', error);
      toast.error(`Failed to load project: ${error.message}`);
      return false;
    }

    if (!data || !data.canvas_data) {
      toast.error('Project data not found');
      return false;
    }

    // Parse the canvas data
    const canvasData = data.canvas_data as unknown as { nodes: Node[], edges: Edge[] };

    if (!canvasData || !Array.isArray(canvasData.nodes) || !Array.isArray(canvasData.edges)) {
      toast.error('Invalid project data format');
      return false;
    }

    // Set up the canvas with the loaded data
    setNodes(canvasData.nodes);
    setEdges(canvasData.edges);
    setSelectedNode(null);
    setHistory(canvasData.nodes, canvasData.edges);
    resetNodeIdCounter(canvasData.nodes);

    toast.success('Project loaded successfully!');
    return true;
  } catch (error: any) {
    console.error('Error loading project:', error);
    toast.error(`Failed to load project: ${error.message}`);
    return false;
  }
};

// Fetch user credits from the database
export const fetchUserCredits = async (): Promise<number | null> => {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('Not logged in, cannot fetch credits');
      return null;
    }

    // Mock implementation - would normally fetch from a real credits table
    // This will return a mock value since we don't have a real user_credits table
    return 10; // Mock value of 10 credits
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return null;
  }
};

// Fetch user subscription from the database
export const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('Not logged in, cannot fetch subscription');
      return null;
    }

    // Mock implementation - would normally fetch from a real subscriptions table
    // Return a mock subscription since we don't have a real subscriptions table
    const mockSubscription: UserSubscription = {
      id: 'sub_mock',
      user_id: session.user.id,
      tier: 'standard',
      is_annual: false,
      starts_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return mockSubscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

// Use credits for generation
export const useCreditsForGeneration = async (currentCredits: number | null): Promise<boolean> => {
  try {
    if (currentCredits === null || currentCredits < 1) {
      toast.error('Not enough credits');
      return false;
    }

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to use credits');
      return false;
    }

    // Mock implementation - would update credits in a real system
    // This would decrement the credits in the database
    console.log('Using 1 credit for generation. Remaining:', currentCredits - 1);
    
    return true;
  } catch (error) {
    console.error('Error using credits:', error);
    toast.error('Failed to use credits for generation');
    return false;
  }
};
