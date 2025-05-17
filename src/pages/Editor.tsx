
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { AppHeader } from '@/components/AppHeader';
import { Toolbar } from '@/components/Toolbar';
import { useCanvasStore } from '@/store/useCanvasStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Editor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Untitled Project');
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<{id: string, email: string}[]>([]);
  
  const loadProject = useCanvasStore(state => state.loadProject);
  const saveProject = useCanvasStore(state => state.saveProject);
  const setRunwayApiKey = useCanvasStore(state => state.setRunwayApiKey);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);
  const fetchUserSubscription = useCanvasStore(state => state.fetchUserSubscription);
  const setIsLocalUpdate = useCanvasStore(state => state.setIsLocalUpdate);
  
  useEffect(() => {
    // Check authentication and redirect if not authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
    };

    checkAuth();
    
    // Set API key - this can later be moved to user settings
    setRunwayApiKey('mroO1ot3dGvbiI9c7e9lQuvpxXyXxAjl');

    // Load project if projectId is provided
    if (projectId) {
      loadProjectData();
    } else {
      setLoading(false);
    }
    
    // Fetch user credits and subscription info
    fetchUserCredits();
    fetchUserSubscription();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, navigate, setRunwayApiKey, fetchUserCredits, fetchUserSubscription]);

  const loadProjectData = async () => {
    setLoading(true);
    
    if (projectId) {
      try {
        // First get project name
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
        
        // Then load the canvas data
        const success = await loadProject(projectId);
        if (!success) {
          toast.error('Failed to load project canvas data');
        }
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('You must be logged in to save a project');
          return;
        }

        const { nodes, edges } = useCanvasStore.getState();
        
        // Set flag to prevent loop with own updates
        setIsLocalUpdate(true);
        
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#121212]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#121212] text-white">
      <AppHeader 
        projectName={projectName} 
        onSave={handleSave} 
        onBackToDashboard={handleBackToDashboard}
        showLogoutButton={true}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 relative">
        <LeftSidebar />
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <RightSidebar />
      </div>
      <Toolbar />
    </div>
  );
};

export default Editor;
