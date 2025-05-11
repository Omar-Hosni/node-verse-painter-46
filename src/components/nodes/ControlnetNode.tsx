
import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2, HelpCircle } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ControlnetNodeProps {
  id: string;
  data: {
    type: string;
    image: string | null;
    imageId?: string;
    uploading?: boolean;
    strength: number;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const ControlnetNode = ({ id, data, selected }: ControlnetNodeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControlNetImage = useCanvasStore(state => state.uploadControlNetImage);
  
  // Determine the controlnet example image based on type
  let controlnetImage = '/lovable-uploads/1c2649bd-85ef-4878-b14a-de464363af13.png'; // Default for segmentation
  
  if (data.type === 'depth') {
    controlnetImage = '/lovable-uploads/d50dc01b-0350-4e41-b8e0-ec31e170b265.png';
  } else if (data.type === 'pose') {
    controlnetImage = '/lovable-uploads/7dd04116-2934-408d-9a4c-d77762bd58c5.png';
  } else if (data.type === 'canny') {
    controlnetImage = '/lovable-uploads/334c0c60-a16b-41af-8e36-3ce5c24b1205.png';
  }

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const imageData = e.target.result as string;
          
          // Update the local image preview
          useCanvasStore.getState().updateNodeData(id, {
            image: imageData,
          });
          
          // Start the upload process
          uploadControlNetImage(id, imageData);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Get the tutorial content for each controlnet type
  const getTutorialContent = () => {
    switch (data.type) {
      case 'depth':
        return {
          title: "Depth ControlNet",
          description: "Depth ControlNet uses depth information to guide image generation, allowing for better control of spatial relationships and 3D structure."
        };
      case 'pose':
        return {
          title: "Pose ControlNet",
          description: "Pose ControlNet uses human pose estimation to guide image generation, perfect for creating specific poses for characters and figures."
        };
      case 'canny':
        return {
          title: "Canny ControlNet",
          description: "Canny ControlNet uses edge detection to guide image generation, helping maintain specific outlines and shapes in the generated image."
        };
      default:
        return {
          title: "Segment ControlNet",
          description: "Segment ControlNet uses segmentation maps to guide image generation, allowing for precise control over different regions and objects."
        };
    }
  };
  
  const tutorialContent = getTutorialContent();

  return (
    <div 
      className={`relative rounded-xl ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ width: 220 }}
    >
      <div 
        className="p-3 flex items-center justify-between"
        style={{ backgroundColor: data.color || '#10b981' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
            <span className="text-xl">{data.emoji || '🎯'}</span>
          </div>
          <span className="text-lg font-medium text-white">
            {data.displayName || `${data.type} Control`}
          </span>
        </div>

        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="text-white hover:text-gray-200">
              <HelpCircle className="h-5 w-5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 bg-gray-800 border-gray-700 text-white">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">{tutorialContent.title}</h4>
              <p className="text-sm text-gray-300">{tutorialContent.description}</p>
              <div className="mt-2 bg-gray-900 rounded overflow-hidden">
                <img 
                  src={controlnetImage}
                  alt={`${data.displayName} example`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Display the image thumbnail if it exists, with loading indicator */}
      <div 
        className="bg-gray-800 cursor-pointer"
        onClick={handleImageClick}
      >
        {data.uploading ? (
          <div className="w-full h-32 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        ) : data.image ? (
          <div className="p-2">
            <img 
              src={data.image} 
              alt={`${data.type} control`}
              className="w-full h-auto object-cover rounded"
              style={{ maxHeight: '120px' }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 border-t border-gray-700">
            <div className="p-4">
              <img 
                src={controlnetImage}
                alt={`${data.type} example`}
                className="w-full h-auto rounded opacity-50"
                style={{ maxHeight: '100px' }}
              />
              <p className="text-center text-gray-400 mt-2 text-sm">Click to upload an image</p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Horizontal handles with improved positioning */}
      <Handle
        type="target"
        position={Position.Left}
        id="controlnet-in"
        className="!bg-white !border-2 !border-green-500 w-4 h-4"
        style={{ left: -12, zIndex: 100 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="controlnet-out"
        className="!bg-white !border-2 !border-green-500 w-4 h-4"
        style={{ right: -12, zIndex: 100 }}
      />
    </div>
  );
};
