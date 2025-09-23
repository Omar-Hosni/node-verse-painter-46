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

    const token = await clerkAuth.getToken();
    if (!token) {
      toast.error('Authentication required to save project');
      return null;
    }

    // Use the create-user-project edge function
    const { data, error } = await supabase.functions.invoke('create-user-project', {
      body: {
        name,
        description,
        canvas_data: canvasData
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error('Error saving project:', error);
      toast.error(`Failed to save project: ${error.message}`);
      return null;
    }

    toast.success('Project saved successfully!');
    return data.project.id;
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
    const clerkAuth = getClerkUser();
    const token = await clerkAuth.getToken();
    if (!token) {
      toast.error('Authentication required to load project');
      return false;
    }

    const { data: projectResponse, error } = await supabase.functions.invoke('get-project', {
      body: { projectId },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error('Error loading project:', error);
      toast.error(`Failed to load project: ${error.message}`);
      return false;
    }

    if (!projectResponse?.project) {
      console.error('Project not found');
      toast.error('Project not found');
      return false;
    }

    const data = projectResponse.project;

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
    if (!clerkAuth.getToken) {
      return 50; // Default for unauthenticated users
    }

    const token = await clerkAuth.getToken();
    if (!token) {
      return 50; // Default for users without valid token
    }

    const { data, error } = await supabase.functions.invoke('get-user-credits', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error('Error fetching user credits:', error);
      return 50; // Default to 50 credits on error
    }

    return data.credits || 50;
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return 50; // Default to 50 credits on error
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
  try {
    const clerkAuth = getClerkUser();
    const token = await clerkAuth.getToken();
    if (!token) {
      toast.error('Authentication required for generation');
      return false;
    }

    const { data, error } = await supabase.functions.invoke('deduct-credits', {
      body: { amount: 5 },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error('Error deducting credits:', error);
      toast.error(error.message || 'Failed to deduct credits');
      return false;
    }

    if (!data.success) {
      if (data.error === 'Insufficient credits') {
        toast.error(`Not enough credits for generation. You have ${data.currentCredits} credits but need ${data.requiredAmount}.`);
      } else {
        toast.error(data.error || 'Failed to deduct credits');
      }
      return false;
    }

    // Success - inform user of remaining credits
    if (data.isAdmin) {
      toast.success('Generation started (Admin account - unlimited credits)');
    } else {
      toast.success(`Generation started! ${data.remainingCredits} credits remaining.`);
    }
    
    return true;
  } catch (error: any) {
    console.error('Error in useCreditsForGeneration:', error);
    toast.error(`Failed to use credits: ${error.message}`);
    return false;
  }
};