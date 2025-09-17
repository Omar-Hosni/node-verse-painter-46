import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClerkIntegration } from '@/hooks/useClerkIntegration';
import { useWorkflowStore } from '@/store/workflowStore';

interface AssetImage {
  id: string;
  url: string;
  type: 'uploaded' | 'generated';
  projectName?: string;
  projectId?: string;
  nodeId?: string;
  createdAt: string;
}

export const useAssetQueries = (projectId?: string) => {
  const [uploadedImages, setUploadedImages] = useState<AssetImage[]>([]);
  const [generatedImages, setGeneratedImages] = useState<AssetImage[]>([]);
  const [loading, setLoading] = useState(true);
  const clerkAuth = useClerkIntegration();
  const { getProcessedImage, getAllProcessedImages } = useWorkflowStore();

  const fetchAssets = async () => {
    if (!clerkAuth.isSignedIn || !clerkAuth.getToken) {
      return;
    }

    try {
      setLoading(true);
      const token = await clerkAuth.getToken();
      if (!token) return;

      // Get user's projects with canvas data
      const { data: projectsData, error } = await supabase.functions.invoke('get-user-projects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) throw error;

      const projects = projectsData?.projects || [];
      const uploaded: AssetImage[] = [];
      const generated: AssetImage[] = [];

      // Extract images from each project's canvas data
      projects.forEach((project: any) => {
        const canvasData = project.canvas_data;
        if (!canvasData?.nodes) return;

        canvasData.nodes.forEach((node: any) => {
          const nodeData = node.data;
          
          // Check for uploaded images (image nodes, controlnet images, etc.)
          if (nodeData?.imageUrl && !nodeData?.preprocessedImage) {
            uploaded.push({
              id: `${project.id}-${node.id}-uploaded`,
              url: nodeData.imageUrl,
              type: 'uploaded',
              projectName: project.name,
              projectId: project.id,
              nodeId: node.id,
              createdAt: project.updated_at,
            });
          }

          // Check for uploaded images in right_sidebar
          if (nodeData?.right_sidebar?.imageUrl && !nodeData?.right_sidebar?.preprocessedImage) {
            uploaded.push({
              id: `${project.id}-${node.id}-right-sidebar-uploaded`,
              url: nodeData.right_sidebar.imageUrl,
              type: 'uploaded',
              projectName: project.name,
              projectId: project.id,
              nodeId: node.id,
              createdAt: project.updated_at,
            });
          }

          // Check for generated/preprocessed images (various formats)
          let preprocessedUrl = null;
          
          // Check preprocessedImage as string
          if (typeof nodeData?.preprocessedImage === 'string' && nodeData.preprocessedImage) {
            preprocessedUrl = nodeData.preprocessedImage;
          }
          // Check preprocessedImage as object
          else if (nodeData?.preprocessedImage && typeof nodeData.preprocessedImage === 'object') {
            const obj = nodeData.preprocessedImage as any;
            preprocessedUrl = obj.guideImageURL || obj.imageURL;
          }
          // Check right_sidebar preprocessedImage
          else if (nodeData?.right_sidebar?.preprocessedImage) {
            preprocessedUrl = nodeData.right_sidebar.preprocessedImage;
          }

          if (preprocessedUrl) {
            generated.push({
              id: `${project.id}-${node.id}-generated`,
              url: preprocessedUrl,
              type: 'generated',
              projectName: project.name,
              projectId: project.id,
              nodeId: node.id,
              createdAt: project.updated_at,
            });
          }

          // Check for workflow-generated images from processedImages store
          // (This will only work for the current project if workflow store is active)
          if (projectId === project.id) {
            const processedImage = getProcessedImage(node.id);
            if (processedImage) {
              generated.push({
                id: `${project.id}-${node.id}-workflow`,
                url: processedImage,
                type: 'generated',
                projectName: project.name,
                projectId: project.id,
                nodeId: node.id,
                createdAt: project.updated_at,
              });
            }
          }
        });
      });

      // Remove duplicates and sort by creation date
      let uniqueUploaded = Array.from(new Map(uploaded.map(img => [img.url, img])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      let uniqueGenerated = Array.from(new Map(generated.map(img => [img.url, img])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filter by project ID if provided (for editor context)
      if (projectId) {
        uniqueUploaded = uniqueUploaded.filter(img => img.projectId === projectId);
        uniqueGenerated = uniqueGenerated.filter(img => img.projectId === projectId);
      }

      setUploadedImages(uniqueUploaded);
      setGeneratedImages(uniqueGenerated);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clerkAuth.isSignedIn) {
      fetchAssets();
    }
  }, [clerkAuth.isSignedIn]);

  return {
    uploadedImages,
    generatedImages,
    loading,
    refetch: fetchAssets,
  };
};