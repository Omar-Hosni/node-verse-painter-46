import React, { useRef, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Image as ImageIcon, Download } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getRunwareService } from '@/services/runwareService';


const API_KEY = "LGwIZIClC1TdL4ulzqWVTf2CAFm4AUpG"; 

interface LayerImageNodeData {
  displayName?: string;
  functionality?: string;
  image?: string;
  imageUrl?: string;
  loading?: boolean;
  uploading?: boolean;
  [key: string]: any;
}

const LayerImageNode: React.FC<NodeProps<LayerImageNodeData>> = ({
  id, 
  data, 
  selected 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateNodeData } = useCanvasStore();

  const runware = useMemo(() => getRunwareService({ apiKey: API_KEY }), []);

  // const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   localStorage.clear()

  //   try {
  //     updateNodeData(id, { uploading: true });

  //     const base64Image = await fileToBase64(file);
      
  //     // Save to store
  //     updateNodeData(id, { 
  //       image: base64Image,
  //       uploading: false
  //     });

  //     // Persist in localStorage
  //     localStorage.setItem(`layer-image-${id}`, base64Image);
  //   } catch (error) {
  //     console.error('Upload error:', error);
  //     updateNodeData(id, { uploading: false });
  //   }
  // };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      updateNodeData(id, { uploading: true });
      const base64Image = await fileToBase64(file);

      // Upload to Runware
      const { imageUUID, imageURL } = await runware.uploadImage(base64Image);
      console.log(imageUUID)
      console.log(imageURL)

      updateNodeData(id, {
        image: imageURL,
        imageUrl: imageURL,
        imageUUID,
        uploading: false
      });

      localStorage.setItem(`layer-image-${id}`, imageURL);
      localStorage.setItem(`layer-image-uuid-${id}`, imageUUID);
    } catch (error) {
      console.error("Upload error:", error);
      updateNodeData(id, { uploading: false });
    }
  };

  const triggerUpload = () => {
    if (data?.functionality === 'input') {
      fileInputRef.current?.click();
    }
  };

  const handleDownload = () => {
    if (data?.image && data?.functionality === 'output') {
      const link = document.createElement('a');
      link.href = data.image as string;
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


  useEffect(() => {
    const storedImage = localStorage.getItem(`layer-image-${id}`);
    if (storedImage && !data?.image) {
      updateNodeData(id, { image: storedImage });
    }
  }, [id, data?.image, updateNodeData]);



  const isOutputNode = data?.functionality === 'output';
  const isInputNode = data?.functionality === 'input';
  const hasImage = Boolean(data?.image || data?.imageUrl);
  const imageSource = (data?.image || data?.imageUrl) as string;

  return (
    <div
      className={`relative bg-[#111] rounded-lg shadow-lg ${selected ? 'ring-1 ring-blue-600 ' : ''}`}
      style={{ width: 200, height: 150 }}
    >
      {hasImage ? (
        <div className="w-full h-full relative">
          <img
            src={imageSource}
            alt={data?.displayName as string || 'Layer Image'}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 flex items-center justify-between">
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
          {data?.loading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin text-white text-2xl">⌛</div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center text-gray-400 transition-colors ${
            isInputNode ? 'cursor-pointer hover:bg-[#222]' : ''
          }`}
          onClick={isInputNode ? triggerUpload : undefined}
        >
          {data?.loading || data?.uploading ? (
            <div className="animate-spin text-2xl">⌛</div>
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