
// @ts-nocheck

import { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { EditorHeader } from '@/components/EditorHeader';
import EnhancedLoadingScreen from '@/components/EnhancedLoadingScreen';

import { useCanvasStore } from '@/store/useCanvasStore';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collaborator, NodeOption } from '@/store/types';
import { DrawingLayer } from '@/components/CollaborativeDrawing/DrawingLayer';
import {DrawingOverlay} from '@/components/DrawingOverlay';
import {FloatingPaintCanvas} from '@/components/FloatingPaintCanvas';
import { useReactFlow } from '@xyflow/react';
import LeftSidebarNodeDesc from '@/components/LeftSidebarNodeDesc';
import { Lasso } from '@/components/Lasso';
import { MaskEditor } from '@/components/MaskEditor';
import { OutpaintControls } from '@/components/OutpaintControls';
import { useEditingTools } from '@/hooks/useEditingTools';
import { Toolbar } from '@/components/Toolbar';
import { useClerkIntegration } from '@/hooks/useClerkIntegration';

const Editor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Untitled Project');
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('init');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeTab, setActiveTab] = useState<'Outline' | 'Insert' | 'Assets'>('Outline');
  const clerkAuth = useClerkIntegration();
  const loadProject = useCanvasStore(state => state.loadProject);
  const saveProject = useCanvasStore(state => state.saveProject);
  const setRunwareApiKey = useCanvasStore(state => state.setRunwareApiKey);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);
  const fetchUserSubscription = useCanvasStore(state => state.fetchUserSubscription);
  const setIsLocalUpdate = useCanvasStore(state => state.setIsLocalUpdate);
  const updateCollaborators = useCanvasStore(state => state.updateCollaborators);
  const {activeTool, setActiveTool} = useCanvasStore();


  const [selectedInsertNode, setSelectedInsertNode] = useState<NodeOption | null>(null);
  
  // Initialize editing tools
  const editingTools = useEditingTools();

  useEffect(() => {
    // Check authentication and redirect if not authenticated
    const checkAuth = () => {
      if (!clerkAuth.isLoaded) return;
      
      if (!clerkAuth.isSignedIn) {
        navigate('/auth');
        return;
      }
    };

    checkAuth();
    
    // Set API key - this can later be moved to user settings
    setRunwareApiKey("v8r2CamVZNCtye7uypGvHfQOh48ZQQaZ");

    // Load project if projectId is provided
    if (projectId) {
      loadProjectData();
      setupPresenceChannel();
    } else {
      setLoading(false);
    }
    
    // Fetch user credits and subscription info
    fetchUserCredits();
    fetchUserSubscription();
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, projectId, navigate, setRunwareApiKey, fetchUserCredits, fetchUserSubscription]);

  // Set up presence channel for collaborators
  const setupPresenceChannel = async () => {
    if (!projectId || !clerkAuth.userId) return;
    
    // Get current user's profile data
    let firstName = '';
    let lastName = '';
    let avatarUrl = '';
    
    try {
      // Use the Edge Function to get profile data
      const { data: profile, error } = await supabase.functions.invoke('get_profile_data', {
        body: { user_id: clerkAuth.userId }
      });
      
      if (error) {
        console.error('Error fetching profile:', error);
      } else if (profile && profile.data) {
        firstName = profile.data.first_name || '';
        lastName = profile.data.last_name || '';
        avatarUrl = profile.data.avatar_url || '';
      }
    } catch (error) {
      console.log('No profile data found, using default values');
    }
    
    // Set up presence channel for this project
    const channel = supabase.channel(`project:${projectId}`, {
      config: { 
        presence: {
          key: clerkAuth.userId,
        },
      },
    });

    // Handle presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const collaboratorsList: Collaborator[] = [];
        
        Object.entries(state).forEach(([userId, userStates]) => {
          // userStates is an array because a user can have multiple states
          const userState = userStates[0] as any;
          collaboratorsList.push({
            id: userId,
            email: userState.email,
            first_name: userState.first_name,
            last_name: userState.last_name,
            avatar_url: userState.avatar_url,
            last_active: new Date().toISOString(),
          });
        });
        
        setCollaborators(collaboratorsList);
        updateCollaborators(collaboratorsList);
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;

        // Track the user's presence once connected
        await channel.track({
          email: clerkAuth.userEmail || '',
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
        });
      });

    // Clean up channel on unmount
    return () => {
      channel.unsubscribe();
    };
  };

  const loadProjectData = async () => {
    setLoading(true);
    setLoadingStep('init');
    setLoadingProgress(0);
    
    if (projectId) {
      try {
        // Step 1: Initialize workspace
        setLoadingStep('init');
        setLoadingProgress(20);
        await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX
        
        // Step 2: Load project data
        setLoadingStep('project');
        setLoadingProgress(40);
        
        const { data, error } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();
        
        if (error) {
          toast.error(`Error loading project: ${error.message}`);
        } else if (data) {
          setProjectName(data.name);
        }
        
        setLoadingProgress(70);
        
        // Step 3: Load canvas data
        setLoadingStep('canvas');
        setLoadingProgress(80);
        
        const success = await loadProject(projectId);
        if (!success) {
          toast.error('Failed to load project canvas data');
        }
        
        setLoadingProgress(100);
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error('Error loading project:', error);
        toast.error(`Failed to load project: ${error.message}`);
      }
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (projectId) {
      // Update existing project
      try {
        if (!clerkAuth.userId) {
          toast.error('You must be logged in to save a project');
          return;
        }

        const { nodes, edges } = useCanvasStore.getState();
        
        // Set flag to prevent loop with own updates
        setIsLocalUpdate(true);
        
        // Ensure preprocessed data is preserved in the saved state
        const serializableNodes = nodes.map(node => {
          if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
              node.data?.preprocessedImage) {
            return {
              ...node,
              data: {
                ...node.data,
                // Ensure preprocessed data is preserved
                preprocessedImage: node.data.preprocessedImage,
                hasPreprocessedImage: !!node.data.preprocessedImage,
                preprocessor: node.data.preprocessor,
                // Preserve right_sidebar state
                right_sidebar: {
                  ...node.data.right_sidebar,
                  preprocessedImage: node.data.preprocessedImage?.guideImageURL,
                  showPreprocessed: !!node.data.preprocessedImage,
                },
              },
            };
          }
          return node;
        });
        
        // Convert to serializable JSON
        const canvasData = {
          nodes: JSON.parse(JSON.stringify(serializableNodes)),
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
        } else {
          toast.success('Project saved successfully!');
        }
      } catch (error: any) {
        console.error('Error saving project:', error);
        toast.error(`Failed to save: ${error.message}`);
      }
    } else {
      // Save as new project - redirect to dashboard after
      const newProjectId = await saveProject(projectName);
      if (newProjectId) {
        navigate(`/editor/${newProjectId}`);
      }
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    navigate('/auth');
  };


  if (loading) {
    const loadingSteps = [
      { 
        id: 'init', 
        label: 'Initializing workspace', 
        completed: loadingStep !== 'init', 
        active: loadingStep === 'init' 
      },
      { 
        id: 'project', 
        label: 'Loading project data', 
        completed: loadingStep === 'canvas' || loadingProgress === 100, 
        active: loadingStep === 'project' 
      },
      { 
        id: 'canvas', 
        label: 'Setting up canvas', 
        completed: loadingProgress === 100, 
        active: loadingStep === 'canvas' 
      },
    ];

    return (
      <EnhancedLoadingScreen
        steps={loadingSteps}
        currentStep={loadingStep}
        message={
          loadingStep === 'init' ? 'Initializing workspace...' :
          loadingStep === 'project' ? 'Loading project data...' :
          loadingStep === 'canvas' ? 'Setting up canvas...' :
          'Loading project...'
        }
        progress={loadingProgress}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#121212] text-white text-sm">
      <EditorHeader 
        projectName={projectName} 
        onSave={handleSave} 
        onBackToDashboard={handleBackToDashboard}
        projectId={projectId}
      />
      <div className="flex flex-1 relative">
        <LeftSidebar activeTab={activeTab} setActiveTab={setActiveTab} setSelectedInsertNode={setSelectedInsertNode} projectId={projectId} />

        <div className="flex-1 relative" id="canvas-area">
          <Canvas onCanvasClick={() => setSelectedInsertNode(null)} />
          <div id="canvas-wrapper" className="absolute inset-0 pointer-events-none">
            <FloatingPaintCanvas isPainting={false} />
          </div>
        </div>

        <RightSidebar />
        
        {/* Preview Panel Overlay */}
        <LeftSidebarNodeDesc selectedInsertNode={selectedInsertNode} setSelectedInsertNode={setSelectedInsertNode}/>
        

        {/* Editing Tool Interfaces */}
        <MaskEditor
          isOpen={editingTools.state.maskEditor.isOpen}
          imageUrl={editingTools.state.maskEditor.imageUrl || ''}
          onMaskComplete={editingTools.maskEditor.onComplete}
          onCancel={editingTools.maskEditor.close}
        />
        
        <OutpaintControls
          isOpen={editingTools.state.outpaintControls.isOpen}
          initialDirection={editingTools.state.outpaintControls.direction}
          initialAmount={editingTools.state.outpaintControls.amount}
          onOutpaintSettings={editingTools.outpaintControls.onSettings}
          onCancel={editingTools.outpaintControls.close}
        />
      </div>
      <Toolbar activeTool={activeTool as any} onToolChange={(tool) => setActiveTool(tool as any)} setActiveTab={setActiveTab}/>

    </div>
  );
};

export default Editor;
