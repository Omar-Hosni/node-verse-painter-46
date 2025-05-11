
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

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
    fetchProjects();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        toast.error(`Error loading projects: ${error.message}`);
        return;
      }

      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error(`Failed to load projects: ${error.message}`);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Create a new empty project
      const { error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          user_id: session.user.id,
          canvas_data: { nodes: [], edges: [] }
        });

      if (error) throw error;

      toast.success('Project created successfully');
      setIsNewProjectDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      fetchProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(`Failed to create project: ${error.message}`);
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

      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(`Failed to delete project: ${error.message}`);
    }
  };

  const openProject = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(`Error signing out: ${error.message}`);
      return;
    }
    navigate('/auth');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader showLogoutButton={true} onLogout={handleLogout} />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-gray-500">Create and manage your AI image generation workflows</p>
          </div>
          <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Give your new image generation workflow a name and optional description.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-description">Description (optional)</Label>
                  <Textarea
                    id="project-description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe your project..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>Cancel</Button>
                <Button onClick={createNewProject}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="h-20 bg-gray-100"></CardContent>
                <CardFooter className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded w-1/4"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-gray-500">
                  <p>Last updated: {formatDate(project.updated_at)}</p>
                  <p>Created: {formatDate(project.created_at)}</p>
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => deleteProject(project.id)}
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button 
                    onClick={() => openProject(project.id)}
                    className="gap-1"
                  >
                    <Pencil className="h-4 w-4" /> Open
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <PlusCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Create your first AI image generation workflow project to get started
            </p>
            <Button onClick={() => setIsNewProjectDialogOpen(true)}>
              Create Your First Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
