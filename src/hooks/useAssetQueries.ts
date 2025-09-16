import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClerkIntegration } from '@/hooks/useClerkIntegration';

interface AssetImage {
  id: string;
  url: string;
  type: 'uploaded' | 'generated';
  projectName?: string;
  projectId?: string;
  nodeId?: string;
  createdAt: string;
}

export const useAssetQueries = () => {
  const [uploadedImages, setUploadedImages] = useState<AssetImage[]>([]);
  const [generatedImages, setGeneratedImages] = useState<AssetImage[]>([]);
  const [loading, setLoading] = useState(true);
  const clerkAuth = useClerkIntegration();

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

          // Check for generated/preprocessed images
          if (nodeData?.preprocessedImage) {
            generated.push({
              id: `${project.id}-${node.id}-generated`,
              url: nodeData.preprocessedImage,
              type: 'generated',
              projectName: project.name,
              projectId: project.id,
              nodeId: node.id,
              createdAt: project.updated_at,
            });
          }

          // Check for preview node outputs (generated images)
          if (node.type === 'preview-node' && nodeData?.generatedImageUrl) {
            generated.push({
              id: `${project.id}-${node.id}-preview`,
              url: nodeData.generatedImageUrl,
              type: 'generated',
              projectName: project.name,
              projectId: project.id,
              nodeId: node.id,
              createdAt: project.updated_at,
            });
          }
        });
      });

      // Remove duplicates and sort by creation date
      const uniqueUploaded = Array.from(new Map(uploaded.map(img => [img.url, img])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const uniqueGenerated = Array.from(new Map(generated.map(img => [img.url, img])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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