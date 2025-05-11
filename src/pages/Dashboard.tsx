
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Plus, Trash2, Edit, CreditCard, Clock, ArrowUpRight } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import { useCanvasStore } from '@/store/useCanvasStore';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const navigate = useNavigate();
  const credits = useCanvasStore(state => state.credits);
  const fetchUserCredits = useCanvasStore(state => state.fetchUserCredits);
  const subscription = useCanvasStore(state => state.subscription);
  const fetchUserSubscription = useCanvasStore(state => state.fetchUserSubscription);
  
  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      
      // Fetch projects
      fetchProjects();
      
      // Fetch credits and subscription
      fetchUserCredits();
      fetchUserSubscription();
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, fetchUserCredits, fetchUserSubscription]);
  
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };
  
  const createNewProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          canvas_data: { nodes: [], edges: [] }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Project created successfully!');
      setShowNewProjectDialog(false);
      setNewProjectName('');
      setNewProjectDescription('');
      
      // Navigate to editor with new project
      navigate(`/editor/${data.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };
  
  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Project deleted successfully!');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <AppHeader 
        projectName="Dashboard" 
        showLogoutButton={true}
        onLogout={handleLogout}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-400">Manage your projects and subscription</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="gap-2 bg-[#1A1A1A] text-gray-300 border-[#333] hover:bg-[#2A2A2A]"
            >
              <CreditCard className="h-4 w-4" />
              {credits !== null ? `${credits.toLocaleString()} credits` : 'Loading credits...'}
            </Button>
            
            <Button
              onClick={() => navigate('/subscription')}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <ArrowUpRight className="h-4 w-4" />
              Get More Credits
            </Button>
          </div>
        </div>
        
        {/* Subscription info card */}
        <div className="mt-6 p-4 rounded-lg bg-[#1A1A1A] border border-[#333]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-900 p-2 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">Current Plan: <span className="text-blue-400 capitalize">{subscription?.tier || 'Free'}</span></h3>
                <p className="text-sm text-gray-400">
                  {subscription?.tier === 'free' 
                    ? 'Upgrade for more credits and features' 
                    : `Next billing: ${subscription?.expires_at ? formatDate(subscription.expires_at) : 'Not available'}`}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/subscription')}
              className={subscription?.tier === 'free' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#2A2A2A] hover:bg-[#333]'}
            >
              {subscription?.tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
            </Button>
          </div>
        </div>
        
        {/* Projects section */}
        <div className="mt-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <Button 
              onClick={() => setShowNewProjectDialog(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-lg border border-[#333] p-8 text-center">
              <h3 className="text-xl font-medium mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-4">Create your first project to get started</p>
              <Button 
                onClick={() => setShowNewProjectDialog(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className="bg-[#1A1A1A] rounded-lg border border-[#333] p-4 hover:border-[#444] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium truncate">{project.name}</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-1 h-10 overflow-hidden">
                    {project.description || 'No description'}
                  </p>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center text-xs text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(project.updated_at)}
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/editor/${project.id}`)}
                      className="gap-1 bg-[#2A2A2A] hover:bg-[#333]"
                    >
                      <Edit className="h-3 w-3" />
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name</label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My Awesome Project"
                className="bg-[#222] border-[#333]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Input
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="A brief description of your project"
                className="bg-[#222] border-[#333]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="bg-[#222] border-[#333] text-gray-300">Cancel</Button>
            </DialogClose>
            <Button onClick={createNewProject} className="bg-blue-600 hover:bg-blue-700">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
