import React, { useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Image as ImageIcon, Download } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useRunwareStore } from '@/store/runwareStore';
import { getRunwareService } from '@/services/runwareService';
import { toast } from "sonner";

interface LayerImageNodeData {
  displayName?: string;
  functionality?: string;
  image?: string;
  imageUrl?: string;
  imageUUID?: string;
  loading?: boolean;
  uploading?: boolean;
  [key: string]: any;
}

const LayerImageNode: React.FC<NodeProps> = ({
  id, 
  data, 
  selected 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  
  // Get generation data from runware store
  const latestGeneration = useRunwareStore((state) => state.latestForOutput(id));
  
  // Get Runware service instance with hardcoded API key
  const runwareService = useMemo(() => {
    const apiKey = "LGwIZIClC1TdL4ulzqWVTf2CAFm4AUpG";
    return getRunwareService({ apiKey });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!runwareService) {
      toast.error("Runware service not available.");
      return;
    }

    try {
      updateNodeData(id, { uploading: true });
      const base64Image = await fileToBase64(file);

      // Upload to Runware
      const { imageUUID, imageURL } = await runwareService.uploadImage(base64Image);

      updateNodeData(id, {
        image: imageURL,
        imageUrl: imageURL,
        imageUUID,
        uploading: false,
        fileName: file.name,
      });

      // Save to localStorage for caching
      localStorage.setItem(`layer-image-${id}`, imageURL);
      localStorage.setItem(`layer-image-uuid-${id}`, imageUUID);
      
      toast.success("Image uploaded to Runware successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      updateNodeData(id, { uploading: false });
      toast.error("Upload failed. Please try again.");
    }
  };

  const triggerUpload = () => {
    if (data?.functionality === 'input') {
      fileInputRef.current?.click();
    }
  };

  const handleDownload = () => {
    const imageUrl = displayImage;
    if (imageUrl && data?.functionality === 'output') {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Determine which image to display
  const displayImage = useMemo(() => {
    // For output nodes, prioritize generation result
    if (data?.functionality === 'output') {
      if (latestGeneration?.status === 'succeeded' && latestGeneration.response?.imageURL) {
        return latestGeneration.response.imageURL;
      }
    }
    
    // Fall back to node data
    return data?.image || data?.imageUrl;
  }, [data?.functionality, data?.image, data?.imageUrl, latestGeneration]);

  // Load image from localStorage if available (fallback)
  useEffect(() => {
    if (!displayImage && !data?.loading && data?.functionality !== 'output') {
      const savedImage = localStorage.getItem(`layer-image-${id}`);
      if (savedImage) {
        updateNodeData(id, { image: savedImage, imageUrl: savedImage });
      }
    }
  }, [id, displayImage, data?.loading, data?.functionality, updateNodeData]);

  const isOutputNode = data?.functionality === 'output';
  const isInputNode = data?.functionality === 'input';
  const hasImage = Boolean(displayImage);

  return (
    <div
      className={`relative bg-[#111] rounded-lg shadow-lg ${selected ? 'ring-1 ring-blue-600 ' : ''}`}
      style={{ width: 200, height: 150 }}
    >
      {hasImage ? (
        <div className="w-full h-full relative">
          <img
            src={displayImage}
            alt={data?.displayName as string || 'Layer Image'}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 flex items-center justify-between rounded-b-lg">
            <span>{data?.displayName as string || 'Image Layer'}</span>
            {isOutputNode && (
              <button
                onClick={handleDownload}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Download image"
              >
                <Download className="h-3 w-3" />
              </button>
            )}
          </div>
          {latestGeneration?.status === 'running' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-white text-sm">Generating...</div>
            </div>
          )}
          {latestGeneration?.status === 'failed' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-red-400 text-sm">Generation failed</div>
            </div>
          )}
          {data?.loading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="animate-spin text-white text-2xl">⌛</div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center text-gray-400 transition-colors rounded-lg ${
            isInputNode ? 'cursor-pointer hover:bg-[#222]' : ''
          }`}
          onClick={isInputNode ? triggerUpload : undefined}
        >
          {data?.loading || data?.uploading ? (
            <div className="animate-spin text-2xl">⌛</div>
          ) : latestGeneration?.status === 'running' ? (
            <div className="text-white text-sm">Generating...</div>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mb-2" />
              <span className="text-sm text-center px-2">
                {isInputNode ? 'Click to upload' : 
                 isOutputNode ? 'Generated image will appear here' : 
                 'No image'}
              </span>
            </>
          )}
        </div>
      )}

      {isInputNode && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      )}

      {/* Input handle for output nodes */}
      {isOutputNode && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!bg-white !border-none w-3 h-3"
          style={{ left: -6 }}
        />
      )}

      {/* Output handle for input nodes */}
      {isInputNode && (
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="!bg-white !border-none w-3 h-3"
        />
      )}
    </div>
  );
};

export default LayerImageNode;