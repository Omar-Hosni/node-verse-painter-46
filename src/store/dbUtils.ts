// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { UserSubscription, UserCredits, Json } from './types';
import { addUserCredits, getUserCredits } from '@/services/stripeService';

// Import Clerk auth context
let clerkAuthContext: any = null;

export const setClerkAuthContext = (context: any) => {
  clerkAuthContext = context;
};

const getClerkUser = () => {
  if (!clerkAuthContext) {
    throw new Error('Clerk auth context not initialized');
  }
  return clerkAuthContext;
};

// Save a project to the database
export const saveProject = async (
  name: string,
  description: string | undefined,
  nodes: Node[],
  edges: Edge[]
): Promise<string | null> => {
  try {
    const clerkAuth = getClerkUser();
    if (!clerkAuth.userId) {
      toast.error('You must be logged in to save a project');
      return null;
    }

    // Convert to serializable JSON, ensuring preprocessed data is preserved
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
        user_id: clerkAuth.userId,
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
      // Fix: Add type assertion and validation
      const canvasData = data.canvas_data as unknown;
      
      // Type guard to verify the shape of the data
      if (!canvasData || typeof canvasData !== 'object' || 
          !('nodes' in canvasData) || !('edges' in canvasData) ||
          !Array.isArray((canvasData as any).nodes) || 
          !Array.isArray((canvasData as any).edges)) {
        console.error('Invalid canvas data format:', canvasData);
        toast.error('Invalid canvas data format');
        return false;
      }
      
      // Now TypeScript knows this is safe
      const typedCanvasData = canvasData as { nodes: Node[], edges: Edge[] };
      const nodes = typedCanvasData.nodes || [];
      const edges = typedCanvasData.edges || [];
      
      // Reset node ID counter to avoid duplicate IDs
      if (nodes.length > 0) {
        resetNodeIdCounterFunc();
      }
      
      // Restore preprocessed data for ControlNet nodes
      const nodesWithPreprocessedData = nodes.map(node => {
        // Check if this is a ControlNet node with preprocessed data
        if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
            node.data?.preprocessedImage) {
          return {
            ...node,
            data: {
              ...node.data,
              // Ensure preprocessed data is properly restored
              hasPreprocessedImage: true,
              isPreprocessing: false,
              // Restore right_sidebar display data
              right_sidebar: {
                ...node.data.right_sidebar,
                preprocessedImage: node.data.preprocessedImage.guideImageURL,
                showPreprocessed: true,
              },
            },
          };
        }
        return node;
      });
      
      // Set the canvas data
      setNodes(nodesWithPreprocessedData);
      setEdges(edges);
      setSelectedNode(null);
      setHistory({ nodes: nodesWithPreprocessedData, edges });
      
      return true;
    } else {
      // Handle case where canvas_data is null or undefined
      toast.error('No canvas data found for this project');
      // Set empty arrays to avoid undefined errors
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setHistory({ nodes: [], edges: [] });
      return false;
    }
  } catch (error: any) {
    console.error('Error loading project:', error);
    toast.error(`Failed to load project: ${error.message}`);
    // Set empty arrays to avoid undefined errors
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setHistory({ nodes: [], edges: [] });
    return false;
  }
};

// Fetch user credits
export const fetchUserCredits = async (): Promise<number | null> => {
  try {
    const clerkAuth = getClerkUser();
    if (!clerkAuth.userId) {
      return null;
    }

    // Special case for admin user with unlimited credits
    if (clerkAuth.userEmail === 'omarhosny.barcelona@gmail.com') {
      return 999999; // Effectively unlimited
    }

    // Get credits from the database
    const credits = await getUserCredits(clerkAuth.userId);
    return credits;
  } catch (error) {
    console.error('Error fetching credits:', error);
    return null;
  }
};

// Fetch user subscription
export const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  try {
    const clerkAuth = getClerkUser();
    if (!clerkAuth.userId) {
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
  // If no credits or less than 5, return false (5 credits needed for 1 generation)
  if (!currentCredits || currentCredits < 5) {
    toast.error('Not enough credits for generation (5 credits required)');
    return false;
  }

  try {
    const clerkAuth = getClerkUser();
    if (!clerkAuth.userId) {
      toast.error('User not authenticated');
      return false;
    }

    // Special case for admin user - no credits deducted
    if (clerkAuth.userEmail === 'omarhosny.barcelona@gmail.com') {
      return true;
    }

    // Deduct 5 credits for generation
    const newCredits = currentCredits - 5;
    
    // Update user credits in database
    const { error } = await supabase
      .from('user_credits')
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('user_id', clerkAuth.userId);

    if (error) {
      console.error('Error updating credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error using credits:', error);
    toast.error('Failed to process credits');
    return false;
  }
};