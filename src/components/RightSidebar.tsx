import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { 
  Trash, 
  Copy, 
  ChevronRight, 
  Settings,
  Upload,
  Link,
  Eye, EyeOff, Palette, Snowflake, RectangleHorizontal, RectangleVertical, ChevronDown,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

import { ScrollArea } from './ui/scroll-area';
import SvgIcon from './SvgIcon';
import * as Slider from '@radix-ui/react-slider';
import { IoMdArrowDropdown, IoMdArrowDropright  } from "react-icons/io";

import EmojiPicker from 'emoji-picker-react';
import { RiveInput } from './RiveInput';

const CustomSlider = ({ value, min, max, step, onChange }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}) => {
  return (
    <Slider.Root
      className="relative flex items-center select-none touch-none w-[82px] h-5"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(val) => onChange(val[0])}
    >
      <Slider.Track className="bg-gray-700 relative grow rounded-full h-[2px]">
        <Slider.Range className="absolute bg-blue-500 h-full rounded-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-gray-200 focus:outline-none" />
    </Slider.Root>
  );
};

export const RightSidebar = () => {
  const [showEmoji, setShowEmoji] = useState(false);

  const { 
    selectedNode, 
    updateNodeData, 
    deleteSelectedNode,
    copySelectedNode,
    selectedEdge,
    deleteEdge,
    uploadControlNetImage,
    uploadInputImage
  } = useCanvasStore();

  const [isUploading, setIsUploading] = useState(false);
  const [currentSelectedStyle, setCurrentSelectedStyle] = useState('accent')

  const ratioShapeMap: { [key: string]: JSX.Element } = {
    '1:1': (
      <div className="w-3.5 h-3.5 bg-transparent border border-[#767676] rounded-sm aspect-square" />
    ),
    '2:3': (
      <div className="h-3.5 w-auto aspect-[2/3] border border-[#767676] rounded-sm" />
    ),
    '3:2': (
      <div className="w-3.5 h-auto aspect-[3/2] border border-[#767676] rounded-sm" />
    ),
    '9:16': (
      <div className="h-3.5 w-auto aspect-[9/16] border border-[#767676] rounded-sm" />
    ),
    '16:9': (
      <div className="w-3.5 h-auto aspect-[16/9] border border-[#767676] rounded-sm" />
    ),
  };

  const ratioSizeMap: Record<string, { width: number; height: number }> = {
    '1:1': { width: 512, height: 512 },
    '2:3': { width: 512, height: 768 },
    '3:2': { width: 768, height: 512 },
    '9:16': { width: 576, height: 1024 },
    '16:9': { width: 1024, height: 576 },
  };


  // Handle image upload for ControlNet or Input nodes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode) return;
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Update node to indicate upload in progress
      updateNodeData(selectedNode.id, { uploading: true });
      
      // Different upload function based on node type
      if (selectedNode.type === 'controlnetNode') {
        await uploadControlNetImage(selectedNode.id, file);
      } else if (selectedNode.type === 'inputNode' && selectedNode.data?.inputType === 'image') {
        await uploadInputImage(selectedNode.id, file);
      }
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };
  
  // This function safely renders inputs with proper type casting
  const renderNumericInput = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to number
    const value = selectedNode.data[property];
    const numericValue = typeof value === 'number' ? value : 0;
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="number"
          value={numericValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              updateNodeData(selectedNode.id, { [property]: newValue });
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };
  
  const renderTextInput = (
    label: string,
    property: string,
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to string
    const value = selectedNode.data[property];
    const textValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={textValue as string}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };

  const renderTypeInput = () => {
    if (!selectedNode) return null;

    const sidebar = selectedNode.data?.right_sidebar || {};
    const sidebarType = (sidebar as any)?.type || 'source';
    const source = (sidebar as any)?.source || 'Image';

    const handleTypeChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...(sidebar as any),
          type: value,
        },
      });
    };

    const handleSourceChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...(sidebar as any),
          source: value,
        },
      });
    };

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
        <div className="flex bg-[#1e1e1e] rounded-full overflow-hidden border border-[#2a2a2a] mb-4">
          <button
            onClick={() => handleTypeChange('source')}
            className={`flex-1 text-sm py-1.5 px-4 font-medium rounded-full transition-colors duration-200
              ${sidebarType === 'source' ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'}`}
          >
            Source
          </button>
          <button
            onClick={() => handleTypeChange('final map')}
            className={`flex-1 text-sm py-1.5 px-4 font-medium rounded-full transition-colors duration-200
              ${sidebarType === 'final map' ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'}`}
          >
            Final map
          </button>
        </div>

        {sidebarType === 'source' && (
          <>
            <div className="flex justify-between items-center mb-4 text-sm text-gray-300">
              <span className="font-medium text-gray-400">Source</span>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="bg-[#1e1e1e] text-sm text-[#9e9e9e]border border-[#2a2a2a] rounded-2xl w-[145px] h-[32px] px-3 py-1"
              >
                <option value="Image">Image</option>
                <option value="Camera">Camera</option>
                <option value="API">API</option>
              </select>
            </div>

            <div className="flex justify-between items-center mb-2 text-sm text-gray-300">
              <span className="font-medium text-gray-400">Map</span>
              <button
                onClick={() => toast.success("Map inserted into canvas")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 w-[145px]"
              >
                <Upload className="h-4 w-4" /> Insert in canvas
              </button>
            </div>
          </>
        )}
      </div>
    );
  };


  const renderImage = (src: string) => {
    return (
      <div className="relative w-[250px] h-[160px] rounded-2xl overflow-hidden group mb-4">
        {/* Image */}
        <img
          src={src}
          alt="Preview"
          className="w-full h-full object-cover"
        />
        {/* Shadow overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );
  };

  const renderImageInput = (label: string, property: string) => {
    if (!selectedNode) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateNodeData(selectedNode.id, { [property]: reader.result });
          toast.success("Image uploaded successfully");
        }
      };
      reader.readAsDataURL(file);
    };

    const imageUrl = selectedNode.data?.[property];

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        {imageUrl ? (
          <div className="relative mb-2">
            <img
              src={imageUrl as string}
              alt="Uploaded"
              className="w-full h-auto rounded-md"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => updateNodeData(selectedNode.id, { [property]: null })}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => document.getElementById('generic-image-upload')?.click()}
          >
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Click to upload image</p>
            </div>
            <input
              id="generic-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    );
  };

  
  const renderColorInput = (label: string, property: string) => {
    if (!selectedNode?.data) return null;

    const value = selectedNode.data[property] ?? '#000000';

    return (
      <div className="flex flex-row mb-4 justify-between items-center">
        <label className="block text-sm font-medium text-[#9e9e9e] mb-1">{label}</label>        
        <input
          type="color"
        value={value as string}
        onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-10 h-10 bg-black rounded-full ml-10 mb-1"
        />
        <input
        type="text"
        value={value as string}
        className="w-[100px] h-[30px] rounded-2xl bg-[#2a2a2a] text-center"
        />
      </div>
    );
  };

  const renderSlider = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;

    const value = selectedNode.data[property];
    const numericValue = typeof value === 'number' ? value : 0;

    const generateOptions = () => {
      const options = [];
      for (let i = min; i <= max; i += step) {
        options.push(
          <option key={i} value={i}>
            {i}{label === "Zoom" ? "%" : "°"}
          </option>
        );
      }
      return options;
    };

    return (
      <div className="mb-4 flex items-center justify-between w-full">
        {/* Label on the left */}
        <label className="text-sm w-[20px] text-[#9e9e9e]">{label}</label>

        {/* Dropdown + Slider on the right */}
        <div className="flex items-center gap-2 w-[170px] justify-end">
          <input
            value={`${numericValue} ${label === 'Zoom' ? '%' : '°'}`}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                [property]: parseFloat(e.target.value),
              })
            }
            className="bg-[#1a1a1a] text-white text-center text-[12px] px-2 py-1 rounded-full w-[80px] h-[30px]"
          />

          <CustomSlider
            value={numericValue}
            min={min}
            max={max}
            step={step}
            onChange={(val) =>
              updateNodeData(selectedNode.id, {
                [property]: val,
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderTextArea = (
    label: string,
    property: string,
    placeholder: string = ""
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to string
    const value = selectedNode.data[property] as string;
    const textValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <textarea
          value={textValue as string}
          placeholder={placeholder}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
        />
      </div>
    );
  };

  const renderNodePositionInputs = () => {
    if (!selectedNode?.position) return null;

    const pin = selectedNode?.data?.pin ?? false;

    const positions = ["left", "center-h", "right", "bottom", "center-v", "top", "between-h", "between-v"]

    return (
      <div className="mb-6 border-b border-field">
        {/* Placeholder for alignment row (icons) */}
        <div className="flex justify-between items-center bg-[#1e1e1e] rounded-full border border-[#2a2a2a] mb-4 hover:rounded-xl ">
          {/* Replace these with actual icons if you implement positioning alignment */}
          {positions.map((p) => (
            <span className="inline-flex p-2 rounded-xl hover:bg-slate-700 transition">
              <SvgIcon name={`positions/${p}`} className="w-5 h-5" />
            </span>
          ))}
        </div>

        {/* Location */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]">Location</label>

          {/* Inputs on the right */}
          <div className="flex gap-2 w-[160px]">
            {/* X */}
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 w-full">
              <input
                value={selectedNode.position.x}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    position: {
                      ...selectedNode.position,
                      x: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full bg-transparent text-sm text-gray-200 outline-none"
                placeholder="X"
              />
              <span className="ml-2 text-gray-500 text-xs">X</span>
            </div>

            {/* Y */}
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 w-full">
              <input
                value={selectedNode.position.y}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    position: {
                      ...selectedNode.position,
                      y: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full bg-transparent text-sm text-gray-200 outline-none"
                placeholder="Y"
              />
              <span className="ml-2 text-gray-500 text-xs">Y</span>
            </div>
          </div>
        </div>


        {/* Pin Toggle */}
        <div className="mb-4 flex items-center justify-between w-full">
        {/* Label on the left */}
        <label className="text-sm text-[#9e9e9e]">Pin</label>

        {/* Toggle on the right */}
        <div className="flex bg-[#1e1e1e] rounded-full overflow-hidden border border-[#2a2a2a] w-[160px] justify-between">
          <button
            onClick={() => updateNodeData(selectedNode.id, { pin: false })}
            className={`w-1/2 py-1.5 text-sm transition-all ${
              !pin ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-400'
            }`}
          >
            No
          </button>
          <button
            onClick={() => updateNodeData(selectedNode.id, { pin: true })}
            className={`w-1/2 py-1.5 text-sm transition-all ${
              pin ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-400'
            }`}
          >
            Yes
          </button>
        </div>
      </div>

      </div>
    );
  };


  const renderNodeDesignInput = () => {
    if (!selectedNode?.data) return null;

    const { skip = false, title = '', color = 'Pink', nodeShape = 'rectangle' } = selectedNode.data;
    const colors = ['Black', 'Blue', 'Green', 'Orange', 'Purple', 'Red', 'Pink', 'Cyan'];

    return (
      <>
        <label className="block text-md font-bold text-white mb-4 border-t border-field py-1">Node</label>

        {/* Skip */}
        <div className="mb-4  flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-md text-[#9e9e9e] mb-1">Skip</label>

          {/* Toggle buttons on the right */}
          <div className="flex bg-[#1e1e1e] rounded-full border border-[#2a2a2a] overflow-hidden">
            <button
              onClick={() => updateNodeData(selectedNode.id, { skip: false })}
              className={`h-[29px] px-4 flex items-center justify-center text-sm ${
                !skip ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              <Eye className="w-16 h-3.5" />
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { skip: true })}
              className={`h-[29px] px-4 flex items-center justify-center text-sm ${
                skip ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              <EyeOff className="w-16 h-3.5" />
            </button>
          </div>
        </div>


        {/* Title */}
        <div className="mb-4 gap-4 flex items-center justify-between w-full">
          {/* Label */}
          <label className="text-sm text-[#9e9e9e] mb-1">Title</label>

          {/* Input with icon picker */}
          <div className="relative w-[170px] h-[30px]">
            <div className="flex items-center rounded-full bg-[#1e1e1e] border border-[#2a2a2a] px-3 py-1.5 pr-10">
              <input
                type="text"
                value={(selectedNode.data?.displayName as string) || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { displayName: e.target.value })
                }
                placeholder="Engine title"
                className="w-full h-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
              />
            </div>

            {/* Palette icon button */}
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="absolute right-2 top-0 bottom-0 my-auto h-full flex items-center text-gray-400 hover:text-white"
            >
              <span className="px-1 border-l border-gray-600 pl-2">🎨</span>
            </button>


            {/* Emoji Picker Popover */}
            {showEmoji && (
              <div className="absolute top-10 translate-y-[2%] translate-x-[2.5%] -right-12 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiData) =>
                    updateNodeData(selectedNode.id, {
                      icon: `${emojiData.emoji}`,
                    })
                  }
                  theme={"dark" as any}
                  className='scale-[75%]'
                />
              </div>
            )}
          </div>
        </div>

        {/* Color */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]">Color</label>

          {/* Custom select on the right */}
          <div className="relative w-[170px] h-[30px] bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 flex items-center justify-between text-sm text-white">
            {/* Colored dot + label */}
            <div className="flex items-center gap-2 pointer-events-none">
              <span
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: (color as string)?.toLowerCase() }}
              ></span>
              <span>{color as string}</span>
            </div>

            {/* Dropdown icon */}
            <IoMdArrowDropdown className="w-4 h-4 text-gray-400 pointer-events-none" />
            {/* Transparent select element */}
            <select
              value={color as string}
              onChange={(e) =>
                currentSelectedStyle === 'accent' ?
                  updateNodeData(selectedNode.id, { iconBgColor: e.target.value })
                  : updateNodeData(selectedNode.id, { color: e.target.value })
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              {colors.map((clr) => (
                <option
                  key={clr}
                  value={clr}
                  className="bg-[#1e1e1e] text-white"
                >
                  {clr}
                </option>
              ))}
            </select>
          </div>
        </div>



        {/* Style (Accent vs Fill) */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]"></label>

          {/* Toggle group on the right (same size as Skip) */}
          <div className="flex h-[30px] bg-[#1e1e1e] rounded-full border border-[#2a2a2a] overflow-hidden">
            <button
              onClick={() => setCurrentSelectedStyle('accent')}
              className={`w-[84px] h-full px-4 flex items-center justify-center text-sm ${
                currentSelectedStyle === 'accent' ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              Accent
            </button>
            <button
              onClick={() => setCurrentSelectedStyle('fill')}
              className={`w-[84px] h-full px-4 flex items-center justify-center text-sm ${
                currentSelectedStyle === 'fill' ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              Fill
            </button>
          </div>
        </div>

        {/* Shape */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]">Shape</label>

          {/* Toggle group on the right (styled like Skip/Style) */}
          <div className="flex h-[30px] bg-[#1e1e1e] rounded-full border border-[#2a2a2a] overflow-hidden">
            <button
              onClick={() => updateNodeData(selectedNode.id, { nodeShape: 'square' })}
              className={`h-full px-4 flex items-center justify-center text-sm ${
                nodeShape === 'square' ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              <Square className="w-16 h-3.5" />
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { nodeShape: 'rectangle' })}
              className={`h-full px-4 flex items-center justify-center text-sm ${
                nodeShape === 'rectangle' ? 'bg-[#2d2d2d] text-white rounded-full' : 'text-gray-500'
              }`}
            >
              <RectangleHorizontal className="w-16 h-3.5" />
            </button>
          </div>
        </div>


      </>
    );
  };


  const renderEngineInput = () => {
    if (!selectedNode?.data?.right_sidebar) return null;

    const { right_sidebar } = selectedNode.data;
    const { image_url, accident, quality, ratio, size } = right_sidebar as any;

    const ratioOptions = ['1:1', '2:3', '3:2', '9:16', '16:9'];

    const defaultSize = ratioSizeMap[ratio || '1:1'];
    const width = size?.width ?? defaultSize.width;
    const height = size?.height ?? defaultSize.height;

    return (
      <>
       <label className="block text-md font-bold text-gray-300 mb-2">Engine</label>
        {renderImage(image_url)}
        
        {/* Accident */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]">Accident</label>

          {/* Styled input with embedded icons */}
          <div className="relative flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 w-[150px]">
            <input
              value={accident || 450}
              min={0}
              max={1000}
              step={1}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    accident: parseInt(e.target.value),
                  },
                })
              }
              className="bg-transparent w-full text-left text-sm text-white outline-none"
            />
          </div>
        </div>

        {/* Quality */}
        <div className="mb-4 flex items-center justify-between w-full">
          {/* Label on the left */}
          <label className="text-sm text-[#9e9e9e]">Quality</label>

          {/* Select + CustomSlider on the right */}
          <div className="flex items-center gap-3 translate-x-[25%] w-[210px]">
            <select
              value={quality || 5}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    quality: parseInt(e.target.value),
                  },
                })
              }
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-sm text-white rounded-2xl px-2 py-1 w-16 h-8"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>

            <CustomSlider
              value={quality || 5}
              min={1}
              max={10}
              step={1}
              onChange={(val) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    quality: val,
                  },
                })
              }
            />
          </div>
        </div>

        {/* Ratio */}
        <div className="flex items-center justify-between w-full mb-4">
          <label className="text-sm text-[#9e9e9e]">Ratio</label>
          <div className="flex items-center justify-end gap-1 bg-[#1e1e1e] p-1 rounded-full border border-[#2a2a2a] w-[147px]">
            {ratioOptions.map((r) => (
              <button
                key={r}
                onClick={() =>
                  updateNodeData(selectedNode.id, {
                    right_sidebar: {
                      ...(right_sidebar as any),
                      ratio: r,
                    },
                  })
                }
                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
                  ratio === r ? 'bg-[#2d2d2d]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {ratioShapeMap[r]}
              </button>
            ))}
          </div>
      </div>

      {/* Size */}
      <div className="mb-4 flex items-center justify-between w-full">
        {/* Label on the left */}
        <label className="text-sm text-[#9e9e9e]">Size</label>

        {/* Inputs on the right */}
        <div className="flex gap-2 w-[145px]">
          {/* Width */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 w-full">
            <input
              value={width || ''}
              min={64}
              max={8192}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    size: {
                      ...(right_sidebar as any)?.size,
                      width: parseInt(e.target.value),
                    },
                  },
                })
              }
              className="w-full bg-transparent text-sm text-gray-200 outline-none"
              placeholder="Width"
            />
            <span className="ml-2 text-gray-500 text-xs">W</span>
          </div>

          {/* Height */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 w-full">
            <input
              value={height || ''}
              min={64}
              max={8192}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    size: {
                      ...(right_sidebar as any)?.size,
                      height: parseInt(e.target.value),
                    },
                  },
                })
              }
              className="w-full bg-transparent text-sm text-gray-200 outline-none"
              placeholder="Height"
            />
            <span className="ml-2 text-gray-500 text-xs">H</span>
          </div>
        </div>
      </div>

      </>
    );
  };

  const renderGearInput = () => {
    if (!selectedNode?.data?.right_sidebar) return null;

    const { right_sidebar } = selectedNode.data;
    const { image_url, power = 70, tags = [] } = right_sidebar as any;

    return (
      <>
       <label className="block text-md font-bold text-gray-300 mb-2">Gear</label>
        {/* Gear Image */}
        {renderImage(image_url)}

        {/* Power */}
        <div className="mb-4 ">
          <label className="block text-sm font-medium text-gray-300 mb-1 ">Power</label>
          <div className="flex items-center gap-2">
            <select
              value={power}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    power: parseInt(e.target.value),
                  },
                })
              }
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-sm text-gray-300 rounded-md px-2 py-1"
            >
              {[...Array(10)].map((_, i) => {
                const value = (i + 1) * 10;
                return (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                );
              })}
            </select>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={power}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...(right_sidebar as any),
                    power: parseInt(e.target.value),
                  },
                })
              }
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="mb-2 py-4">
          <label className="block text-sm font-medium text-gray-300 mb-1" >Tags</label>
          <div className="flex flex-wrap gap-2">
            {(tags.length ? tags : ['#tags_here', '#tags', '#Jhon_weck', '#tag_name', '#Jhon']).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs text-gray-300 bg-[#1e1e1e] px-3 py-1 rounded-full border border-[#2a2a2a]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  };


  
  // Utility to check if a property exists
  const hasProperty = (property: string) => {
    return (selectedNode?.data && property in selectedNode.data) || 
    (selectedNode?.data?.right_sidebar && property in (selectedNode.data?.right_sidebar as object));
  };

  // Render node-specific controls based on type
  const renderNodeSpecificControls = () => {
    if (!selectedNode) return null;
    
    // Handle new schema-based nodes
    if (selectedNode.type === 'normal-node' || selectedNode.type === 'layer-image') {

      return renderSchemaBasedControls();
    }
    
    // Keep existing controls for backward compatibility
    switch (selectedNode.type) {
      // Label Node Controls
      case 'labeledFrameGroupNode':
      return (
        <>
          <label className="block text-sm font-medium text-gray-300 mb-1">Label Name</label>
          <input
            type="text"
            value={(selectedNode.data.label as string) || ''}
            onChange={(e) =>
              useCanvasStore.getState().updateNodeData(selectedNode.id, {
                label: e.target.value,
              })
            }
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {renderColorInput('Color', 'color')}
        </>
      );
      
      // Shape Node Controls
      case 'shape-circle':
        return(
          <>
          {renderNodePositionInputs()}
          </>
        );
      case 'shape-triangle':
      return(
        <>
        {renderNodePositionInputs()}
        </>
      );
      case 'shape-rectangle':
      return(
        <>
        {renderNodePositionInputs()}
        </>
      );

      // Frame Node Controls      
      case 'frame-node':
      return (
        <>
          {renderNumericInput('Frame Width', 'width', 100, 2000, 10)}
          {renderNumericInput('Frame Height', 'height', 100, 2000, 10)}
        </>
      );

      // Comment Node Controls
      case 'comment-node':
      return (
        <>
          {renderTextInput('Comment Text', 'text')}
          {renderColorInput('Background Color', 'color')}
        </>
      );
        
      default:
        return renderSchemaBasedControls();
    }
  };

  const renderSchemaBasedControls = () => {
    if (!selectedNode?.data?.type) return null;
    
    const nodeType = selectedNode.data.type;

    switch (nodeType) {

      case 'control-net-pose':
        return (
          <>
            {renderNodePositionInputs()}
            {<RiveInput key={selectedNode?.id} nodeType="pose"/>}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'control-net-edge':
      case 'control-net-depth':
      case 'control-net-segments':
      case 'control-net-normal-map':
        return (
          <>
            {renderNodePositionInputs()}
            {renderImage((selectedNode?.data?.right_sidebar as any)?.image_input)}
            {renderTypeInput()}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'control-net-lights':
        return (
          <>
            {renderNodePositionInputs()}
            {<RiveInput key={selectedNode?.id} nodeType="lights"/>}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'control-net-reference':
        return (
          <>
            {renderNodePositionInputs()}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={(selectedNode.data.type as string) || 'source'}
                onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              >
                <option value="source">Source</option>
                <option value="final map">Final Map</option>
              </select>
            </div>
            {renderSlider('Power', 'power', 0, 100, 1)}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'image-to-image-re-imagine':
        return (
          <>
            {renderNodePositionInputs()}
            {renderSlider('Creativity', 'creativity', 0, 100, 1)}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'image-to-image-reangle':
        return (
          <>
            {renderNodePositionInputs()}
            {renderNumericInput('Angle X', 'angle.x', -180, 180, 1)}
            {renderNumericInput('Angle Y', 'angle.y', -180, 180, 1)}
            {renderNumericInput('Angle Z', 'angle.z', -180, 180, 1)}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'input-text':
        return (
          <>
            {renderNodePositionInputs()}
            {renderTextArea('Prompt', 'prompt', 'Enter your prompt here...')}
            {renderTextArea('Negative Prompt', 'negative', 'Enter negative prompt here...')}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(selectedNode.data.enhance as boolean) || false}
                  onChange={(e) => updateNodeData(selectedNode.id, { enhance: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Enhance</span>
              </label>
            </div>
            {renderNodeDesignInput()}
          </>
        );
        
      case 'preview-image':
      case 'preview-realtime':
        return (
          <>
            {renderNodePositionInputs()}
            {renderTextInput('Preview', 'preview')}
            {renderSlider('Quality', 'quality', 0, 100, 1)}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Ratio</label>
              <select
                value={(selectedNode.data.ratio as string) || 'Outpaint'}
                onChange={(e) => updateNodeData(selectedNode.id, { ratio: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              >
                <option value="Outpaint">Outpaint</option>
                <option value="Inpaint">Inpaint</option>
              </select>
            </div>
            {renderSlider('Accident', 'accident', 0, 100, 1)}
            {renderNodeDesignInput()}
          </>
        );
      
      case 'engine-real':
        return(
        <>
          {renderNodePositionInputs()}
          {renderEngineInput()}
          {renderNodeDesignInput()}
        </>
      )

      case 'gear-anime':
        return(
        <>
          {renderNodePositionInputs()}
          {renderGearInput()}
          {renderNodeDesignInput()}
        </>
      )
      case 'gear-killua':
        return(
        <>
          {renderNodePositionInputs()}
          {renderGearInput()}
          {renderNodeDesignInput()}
        </>
      )

      default:
        return (
          <p className="text-sm text-gray-500">
            Select a node to view and edit its properties.
          </p>
        );
    }
  };

  
  // If no node is selected but an edge is selected
  const renderEdgeControls = () => {
    if (!selectedEdge) return null;
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Edge Properties</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteEdge(selectedEdge.id)}
          >
            <Trash className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
        
        <p className="text-sm text-gray-400 mb-2">
          Source: {selectedEdge.source}
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Target: {selectedEdge.target}
        </p>
      </div>
    );
  };

  
  // Helper function to get node color
  const getNodeColor = () => {
    if (!selectedNode?.data) return "#666666";
    
    // If node has color property in its data
    if (selectedNode.data.color && typeof selectedNode.data.color === 'string') {
      return selectedNode.data.color;
    }
    
    // Or determine by node type
    switch (selectedNode.type) {
      case 'modelNode': return "#8000ff";
      case 'loraNode': return "#9370db";
      case 'controlnetNode': return "#4CAF50";
      case 'inputNode': return "#FFD700";
      case 'previewNode': return "#f59e0b";
      default: return "#666666";
    }
  };
  
  // Empty state when nothing is selected
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        {/* <Settings className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">No Selection</h3>
        <p className="text-sm text-gray-500">
          Select a node or edge on the canvas to view and edit its properties.
        </p> */}
      </div>
    );
  };

  // Main render
  return (
    <div className={selectedNode ? "w-[14%] h-full bg-[#0d0d0d] border-l border-field flex flex-col overflow-hidden" : "w-[14%] h-full bg-[#0d0d0d] border-l border-field"}>
      
      {/* Properties panel */}
      <ScrollArea className="h-[calc(100vh-80px)] overflow-y-auto">
        {selectedNode ? (
          <div className="p-4">
            {/* Node header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: getNodeColor() }}
                />
                <h2 className="text-lg font-medium text-white truncate " 
                    title={selectedNode.data?.displayName && typeof selectedNode.data.displayName === 'string' 
                      ? selectedNode.data.displayName 
                      : selectedNode.id}>
                  {selectedNode.data?.displayName && typeof selectedNode.data.displayName === 'string'
                    ? selectedNode.data.displayName
                    : selectedNode.id}
                </h2>
              </div>
              
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copySelectedNode()}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy node</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => deleteSelectedNode()}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete node</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {/* Type and ID info */}
            <div className="mb-4 text-xs text-gray-500">
              <p>Type: {selectedNode.type}</p>
              <p>ID: {selectedNode.id}</p>
            </div>
            
            {/* Node-specific controls */}
            <div className="mt-6">
              {renderNodeSpecificControls()}
            </div>
          </div>
        ) : selectedEdge ? (
          renderEdgeControls()
        ) : (
          renderEmptyState()
        )}
      </ScrollArea>
    </div>
  );
};

export default RightSidebar;