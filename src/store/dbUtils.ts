
// This file will handle all database operations
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HistoryState, UserCredits, Json, UserSubscription, SubscriptionTier } from './types';
import { Node, Edge } from '@xyflow/react';

// Mock user ID for testing
const mockUserId = 'test-user-id';

/**
 * Save a project to the database
 */
export const saveProject = async (
  name: string,
  description: string | undefined,
  nodes: Node[],
  edges: Edge[]
): Promise<string | null> => {
  try {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || mockUserId;

    const canvasData = {
      nodes,
      edges
    };

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || '',
        user_id: userId,
        canvas_data: canvasData as Json,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
      return null;
    }

    toast.success('Project saved successfully');
    return data.id;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.error('Failed to save project');
    return null;
  }
};

/**
 * Load a project from the database
 */
export const loadProject = async (
  projectId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
  setSelectedNode: (node: Node | null) => void,
  setHistory: (nodes: Node[], edges: Edge[]) => void,
  resetNodeIdCounter: (nodes: Node[]) => void
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('canvas_data')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
      return false;
    }

    // Type assertion and safety check
    const canvasData = data.canvas_data as unknown as { nodes: Node[], edges: Edge[] };
    
    if (canvasData && 'nodes' in canvasData && 'edges' in canvasData) {
      setNodes(canvasData.nodes);
      setEdges(canvasData.edges);
      setSelectedNode(null);
      resetNodeIdCounter(canvasData.nodes);
      
      // Initialize history with loaded state
      setHistory(canvasData.nodes, canvasData.edges);
      
      toast.success('Project loaded successfully');
      return true;
    } else {
      console.error('Invalid canvas data format:', data.canvas_data);
      toast.error('Invalid project data format');
      return false;
    }
  } catch (error) {
    console.error('Error loading project:', error);
    toast.error('Failed to load project');
    return false;
  }
};

/**
 * Fetch user credits from the database
 */
export const fetchUserCredits = async (): Promise<number | null> => {
  try {
    // Check if user_credits table exists
    const { error: tableExistsError } = await supabase.rpc('check_table_exists', { table_name: 'user_credits' });
    
    if (tableExistsError) {
      console.info('Using mock credits value since user_credits table does not exist yet');
      return 100; // Mock credit value
    }
    
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || mockUserId;

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found
        console.info('No credits record found, using default value');
        return 10; // Default credits for new users
      }
      console.error('Error fetching credits:', error);
      return null;
    }

    return data.credits_balance;
  } catch (error) {
    console.error('Error fetching credits:', error);
    return null;
  }
};

/**
 * Fetch user subscription from the database
 */
export const fetchUserSubscription = async (): Promise<UserSubscription | null> => {
  try {
    // Check if subscriptions table exists
    const { error: tableExistsError } = await supabase.rpc('check_table_exists', { table_name: 'subscriptions' });
    
    if (tableExistsError) {
      console.info('Using mock subscription since subscriptions table does not exist yet');
      // Return a mock subscription
      return {
        id: 'mock-subscription-id',
        user_id: mockUserId,
        tier: 'standard' as SubscriptionTier,
        is_annual: false,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || mockUserId;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data as unknown as UserSubscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
};

/**
 * Use credits for generation
 */
export const useCreditsForGeneration = async (currentCredits: number | null): Promise<boolean> => {
  if (currentCredits === null || currentCredits < 1) {
    toast.error('Not enough credits');
    return false;
  }

  try {
    // Check if user_credits table exists
    const { error: tableExistsError } = await supabase.rpc('check_table_exists', { table_name: 'user_credits' });
    
    if (tableExistsError) {
      console.info('Using mock credits operation since user_credits table does not exist yet');
      return true; // Mock successful credit usage
    }
    
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || mockUserId;

    const { error } = await supabase
      .from('user_credits')
      .update({ credits_balance: currentCredits - 1 })
      .eq('user_id', userId);

    if (error) {
      console.error('Error using credits:', error);
      toast.error('Failed to use credits');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error using credits:', error);
    toast.error('Failed to use credits');
    return false;
  }
};
