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
import { Plus, Trash2, Edit, Clock, Home, History, FolderOpen, Users, Briefcase, FileText, Search, Image as ImageIcon } from 'lucide-react';
import { useAssetQueries } from '@/hooks/useAssetQueries';
import { AssetGrid } from '@/components/AssetGrid';
import SimpleLoadingScreen from '@/components/SimpleLoadingScreen';
import { toast } from 'sonner';
import { useClerkIntegration } from '@/hooks/useClerkIntegration';
import { SignOutButton } from '@clerk/clerk-react';

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
  const [activeTab, setActiveTab] = useState('Home');
  const navigate = useNavigate();
  const clerkAuth = useClerkIntegration();
  const { uploadedImages, generatedImages, loading: assetsLoading } = useAssetQueries();

  // Generate project thumbnail URL from dashboard images
  const getProjectThumbnail = (project: Project, index: number) => {
    const dashboardImages = [
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1894.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1895.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1896.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1897.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1898.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1899.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1900.png',
      '/Dashboard images (temporary till we make each file produce its own preview image)/Rectangle 1901.png',
    ];
    
    // Use project id hash for consistent random selection
    const hash = project.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const imageIndex = Math.abs(hash) % dashboardImages.length;
    return dashboardImages[imageIndex];
  };

  const navigationItems = [
    { name: 'Home', icon: Home },
    { name: 'Files', icon: FolderOpen },
    { name: 'Assets', icon: ImageIcon },
    { name: 'Templates', icon: FileText },
    { name: 'Community', icon: Users },
    { name: 'Nover Folio', icon: Briefcase },
  ];

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (!clerkAuth.isLoaded) return;
      
      if (!clerkAuth.isSignedIn) {
        navigate('/auth');
        return;
      }

      // Fetch projects when authenticated
      fetchProjects();
    };

    checkAuth();
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, navigate]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (!clerkAuth.getToken) {
        throw new Error('Authentication not ready');
      }

      const token = await clerkAuth.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const { data, error } = await supabase.functions.invoke('get-user-projects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

      setProjects(data?.projects || []);
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

    if (!clerkAuth.getToken) {
      toast.error('Authentication not ready');
      return;
    }

    try {
      const token = await clerkAuth.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const { data, error } = await supabase.functions.invoke('create-user-project', {
        body: {
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

      toast.success('Project created successfully!');
      setShowNewProjectDialog(false);
      setNewProjectName('');
      setNewProjectDescription('');

      // Navigate to editor with new project
      navigate(`/editor/${data.project.id}`);
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
      if (!clerkAuth.getToken) {
        throw new Error('Authentication not ready');
      }

      const token = await clerkAuth.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const { error } = await supabase.functions.invoke('delete-user-project', {
        body: { projectId: id },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

      toast.success('Project deleted successfully!');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Button components from EditorHeader
  const PrimaryButton = ({
    onClick,
    children,
    icon: Icon,
    disabled = false,
    className = ""
  }: {
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 justify-center transition-colors ${className}`}
      style={{
        backgroundColor: disabled ? undefined : '#007AFF',
        minHeight: '30px',
        height: '30px'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#0056CC';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#007AFF';
        }
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );

  const SecondaryButton = ({
    onClick,
    children,
    icon: Icon,
    disabled = false,
    className = ""
  }: {
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 justify-center transition-colors ${className}`}
      style={{
        backgroundColor: disabled ? undefined : '#1a1a1a',
        minHeight: '30px',
        height: '30px'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#333333';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#1a1a1a';
        }
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );

  const renderPageHeader = () => {
    return (
      <header className="flex items-center justify-between" style={{ paddingTop: '22px', paddingBottom: '22px', paddingLeft: '16px', paddingRight: '22px' }}>
        {/* Page Title */}
        <h1 className="text-lg font-medium text-white w-[80px]">{activeTab}</h1>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative h-[30px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9e9e9e] z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-full bg-white/[0.04] rounded-full pl-10 pr-3 py-1.5 text-sm text-white placeholder-[#9e9e9e] outline-none"
            />
          </div>
        </div>

        {/* Buttons Container */}
        <div className="w-[320px] flex gap-2 items-center justify-end">
          <SecondaryButton
            onClick={() => navigate('/subscription')}
          >
            Subscription
          </SecondaryButton>
          <SecondaryButton
            onClick={async () => {
              navigate('/auth');
            }}
          >
            <SignOutButton />
          </SecondaryButton>
          <PrimaryButton
            onClick={() => setShowNewProjectDialog(true)}
          >
            New Project
            <Plus className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </header>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <div className="pl-4 pr-[22px] space-y-8">
            {/* Recent Files Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Recent Files</h3>
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                  {projects.slice(0, 4).map((project, index) => (
                    <div
                      key={project.id}
                      className="relative group cursor-pointer"
                      onClick={() => navigate(`/editor/${project.id}`)}
                    >
                      <div
                        className="relative rounded-lg overflow-hidden bg-[#1A1A1A]"
                        style={{ aspectRatio: '1 / 0.7' }}
                      >
                        <img
                          src={getProjectThumbnail(project, index)}
                          alt={`Preview for ${project.name}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="font-medium text-white truncate text-sm">
                              {project.name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No recent files</p>
              )}
            </div>

            {/* Assets Section */}
            <div>
              <AssetGrid
                images={[...uploadedImages.slice(0, 4), ...generatedImages.slice(0, 4)].slice(0, 4)}
                title="Recent Assets"
                loading={assetsLoading}
                showProjectInfo={true}
                onImageClick={(image) => {
                  if (image.projectId) {
                    navigate(`/editor/${image.projectId}`);
                  }
                }}
              />
            </div>

            {/* Templates Section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                {/* Template placeholders */}
                <div className="relative group cursor-pointer">
                  <div
                    className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                    style={{ aspectRatio: '1 / 0.7' }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-blue-400" />
                      </div>
                      <h4 className="text-white font-medium mb-2 text-center">Portrait Generator</h4>
                      <p className="text-gray-400 text-xs text-center">AI-powered portrait generation</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                        <span className="text-gray-300 text-xs">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative group cursor-pointer">
                  <div
                    className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                    style={{ aspectRatio: '1 / 0.7' }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                      <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-purple-400" />
                      </div>
                      <h4 className="text-white font-medium mb-2 text-center">Style Transfer</h4>
                      <p className="text-gray-400 text-xs text-center">Transform with artistic styles</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                        <span className="text-gray-300 text-xs">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative group cursor-pointer">
                  <div
                    className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                    style={{ aspectRatio: '1 / 0.7' }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                      <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-green-400" />
                      </div>
                      <h4 className="text-white font-medium mb-2 text-center">Background Remove</h4>
                      <p className="text-gray-400 text-xs text-center">Automatic background removal</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                        <span className="text-gray-300 text-xs">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative group cursor-pointer">
                  <div
                    className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                    style={{ aspectRatio: '1 / 0.7' }}
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                      <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="h-6 w-6 text-orange-400" />
                      </div>
                      <h4 className="text-white font-medium mb-2 text-center">Upscaling</h4>
                      <p className="text-gray-400 text-xs text-center">Enhance image resolution</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                        <span className="text-gray-300 text-xs">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'Assets':
        return (
          <div className="pl-4 pr-[22px] space-y-8">
            <AssetGrid
              images={uploadedImages}
              title="Uploaded Images"
              loading={assetsLoading}
              showProjectInfo={true}
              onImageClick={(image) => {
                if (image.projectId) {
                  navigate(`/editor/${image.projectId}`);
                }
              }}
            />
            <AssetGrid
              images={generatedImages}
              title="Generated Images"
              loading={assetsLoading}
              showProjectInfo={true}
              onImageClick={(image) => {
                if (image.projectId) {
                  navigate(`/editor/${image.projectId}`);
                }
              }}
            />
          </div>
        );
      case 'Templates':
        return (
          <div className="pl-4 pr-[22px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
              {/* Template cards */}
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Portrait Generator</h4>
                    <p className="text-gray-400 text-xs text-center">AI-powered portrait generation</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Style Transfer</h4>
                    <p className="text-gray-400 text-xs text-center">Transform with artistic styles</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-green-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Background Remove</h4>
                    <p className="text-gray-400 text-xs text-center">Automatic background removal</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-orange-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Upscaling</h4>
                    <p className="text-gray-400 text-xs text-center">Enhance image resolution</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-red-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Object Relighting</h4>
                    <p className="text-gray-400 text-xs text-center">Relight objects in images</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative group cursor-pointer">
                <div
                  className="relative rounded-lg overflow-hidden bg-[#1A1A1A] flex flex-col"
                  style={{ aspectRatio: '1 / 0.7' }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-yellow-400" />
                    </div>
                    <h4 className="text-white font-medium mb-2 text-center">Inpainting</h4>
                    <p className="text-gray-400 text-xs text-center">Remove or replace parts of images</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                      <span className="text-gray-300 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Community':
        return (
          <div className="pl-4 pr-[22px]">
            <p className="text-gray-400">Explore community projects and collaborate.</p>
          </div>
        );
      case 'Nover Folio':
        return (
          <div className="pl-4 pr-[22px]">
            <p className="text-gray-400">Your portfolio showcase - coming soon!</p>
          </div>
        );
      case 'Files':
      default:
        return (
          <div className="pl-4 pr-[22px]">

            {loading ? (
              <div className="h-60">
                <SimpleLoadingScreen
                  message="Loading your projects"
                  size="medium"
                  showLogo={false}
                />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="relative group cursor-pointer"
                    onClick={() => navigate(`/editor/${project.id}`)}
                  >
                    {/* 1:7 Aspect Ratio Image */}
                    <div
                      className="relative rounded-lg overflow-hidden bg-[#1A1A1A]"
                      style={{ aspectRatio: '1 / 0.7' }}
                    >
                      <img
                        src={getProjectThumbnail(project, index)}
                        alt={`Preview for ${project.name}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay with gradient and details */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {/* Project details at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex justify-between items-end">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white truncate text-sm">
                                {project.name}
                              </h3>
                              <div className="flex items-center text-xs text-gray-300 mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(project.updated_at)}
                              </div>
                            </div>

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.id);
                              }}
                              className="text-gray-400 hover:text-red-400 transition-colors ml-2 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex">
      {/* Left Sidebar */}
      <div className="w-[265px] p-4">
        {/* User Avatar Component */}
        <div className="flex items-center mb-8 pl-3 pt-3">
          {/* Avatar Image */}
          <img
            src={clerkAuth.user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(clerkAuth.user?.firstName || clerkAuth.userEmail || 'User')}&background=007AFF&color=fff&size=128`}
            alt="User Avatar"
            className="w-[30px] h-[30px] rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(clerkAuth.userEmail || 'User')}&background=007AFF&color=fff&size=128`;
            }}
          />

          {/* User Info */}
          <div className="ml-3 flex flex-col">
            <span className="text-white text-sm font-Medium leading-none">
              {clerkAuth.user?.firstName && clerkAuth.user?.lastName 
                ? `${clerkAuth.user.firstName} ${clerkAuth.user.lastName}`
                : clerkAuth.userEmail?.split('@')[0] || 'User'}
            </span>
            <span className="text-white/50 text-sm font-medium leading-none mt-0.5">Free account</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors group ${activeTab === item.name
                  ? 'bg-white/[0.04] text-white'
                  : 'text-white/50 hover:text-white'
                  }`}
              >
                <IconComponent className={`h-4 w-4 transition-colors ${activeTab === item.name
                  ? 'text-white'
                  : 'text-white/50 group-hover:text-white'
                  }`} strokeWidth={1.5} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.name === 'Nover Folio' && (
                  <span className="bg-[#007AFF] text-white px-2 py-0 text-[10px] rounded-2xl">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {renderPageHeader()}
        <div className="flex-1">
          {renderContent()}
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