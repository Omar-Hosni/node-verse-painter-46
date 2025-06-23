import React, { useState } from 'react';
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

import Rive from "@rive-app/react-canvas";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { ScrollArea } from './ui/scroll-area';
import SvgIcon from './SvgIcon';
import * as Slider from '@radix-ui/react-slider';

const CustomSlider = ({ value, min, max, step, onChange }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}) => {
  return (
    <Slider.Root
      className="relative flex items-center select-none touch-none w-[72px] h-5"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(val) => onChange(val[0])}
    >
      <Slider.Track className="bg-gray-700 relative grow rounded-full h-[3px]">
        <Slider.Range className="absolute bg-blue-500 h-full rounded-full" />
      </Slider.Track>
      <Slider.Thumb className="block w-4 h-4 bg-white rounded-full shadow hover:bg-gray-200 focus:outline-none" />
    </Slider.Root>
  );
};

export const RightSidebar = () => {
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
          value={textValue}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };

  const renderTypeInput = () => {
    if (!selectedNode) return null;

    const sidebar = selectedNode.data?.right_sidebar || {};
    const sidebarType = sidebar.type || 'source';
    const source = sidebar.source || 'Image';

    const handleTypeChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...sidebar,
          type: value,
        },
      });
    };

    const handleSourceChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...sidebar,
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full bg-[#1e1e1e] text-sm text-gray-300 border border-[#2a2a2a] rounded-md px-3 py-2"
              >
                <option value="Image">Image</option>
                <option value="Camera">Camera</option>
                <option value="API">API</option>
              </select>
            </div>

            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Map</label>
              <button
                onClick={() => toast.success("Map inserted into canvas")} // replace with your actual handler
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Insert in canvas
              </button>
            </div>
          </>
        )}
      </div>
    );
  };


  const renderImage = (src: string) =>{

    return (
      <div className="mb-4">
          <div className="relative mb-2">
            <img
              src={src}
              className="w-full h-auto rounded-md"
            />
          </div>
      </div>
    );
  }

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
              src={imageUrl}
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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
          type="color"
          value={value}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full h-10 p-0 border-none bg-transparent"
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
    <div className="mb-3">
      <div className="flex gap-4 w-full justify-end">
        {/* Label + Dropdown */}
        <div className="flex items-end justify-end gap-5">
          <label className=" text-sm font-medium text-gray-300 whitespace-nowrap">
              {label}
          </label>
          <select
            value={numericValue}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                [property]: parseFloat(e.target.value),
              })
            }
            className="bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded-md border border-gray-600 w-[50px]"
          >
            {generateOptions()}
          </select>

          {/* Range Slider */}
          {/* <input
            type="range"
            value={numericValue}
            min={min}
            max={max}
            step={step}
            onChange={(e) => updateNodeData(selectedNode.id, { [property]: parseFloat(e.target.value) })}
            className="h-1 w-[30%] bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
          /> */}
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
    const value = selectedNode.data[property];
    const textValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <textarea
          value={textValue}
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
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
          <div className="flex gap-2">
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2 w-full">
              <input
                type="number"
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
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2 w-full">
              <input
                type="number"
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
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Pin</label>
          <div className="flex bg-[#1e1e1e] rounded-full overflow-hidden border border-[#2a2a2a] w-fit">
            <button
              onClick={() => updateNodeData(selectedNode.id, { pin: false })}
              className={`px-4 py-1.5 text-sm rounded-full transition-all ${
                !pin ? 'bg-[#2d2d2d] text-white' : 'text-gray-400'
              }`}
            >
              No
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { pin: true })}
              className={`px-4 py-1.5 text-sm rounded-full transition-all ${
                pin ? 'bg-[#2d2d2d] text-white' : 'text-gray-400'
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

    const { skip = false, title = '', color = 'Pink', nodeShape = 'rectangle', style = 'accent' } = selectedNode.data;
    const colors = ['Black', 'Blue', 'Green', 'Orange', 'Purple', 'Red', 'Pink', 'Cyan'];

    return (
      <>
        <label className="block text-md font-bold text-white mb-4 border-t border-field py-4">Node</label>

        {/* Skip */}
        <div className="mb-4 ">
          <label className="block text-sm font-medium text-gray-300 mb-1">Skip</label>
          <div className="flex bg-[#1e1e1e] rounded-full border border-[#2a2a2a] w-fit overflow-hidden">
            <button
              onClick={() => updateNodeData(selectedNode.id, { skip: false })}
              className={`px-4 py-1.5 flex items-center justify-center text-sm ${
                !skip ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { skip: true })}
              className={`px-4 py-1.5 flex items-center justify-center text-sm ${
                skip ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'
              }`}
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
          <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2">
            <input
              type="text"
              value={selectedNode.data?.displayName}
              onChange={(e) => updateNodeData(selectedNode.id, { displayName: e.target.value })}
              className="w-full bg-transparent text-sm text-gray-200 outline-none"
              placeholder="e.g Standing Pose"
            />
            <Palette className="ml-2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>

          <div className="relative w-40 bg-[#1e1e1e] border border-[#2a2a2a] rounded-full px-3 py-1.5 flex items-center justify-between text-sm text-white">
            <div className="flex items-center gap-2 pointer-events-none">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color.toLowerCase() }}
              ></span>
              <span>{color}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={color}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { color: e.target.value })
              }
              className="absolute inset-0 w-full h-full opacity-0 text-white bg-[#1e1e1e] cursor-pointer"
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
        <div className="mb-4">
          <div className="flex bg-[#1e1e1e] rounded-full border border-[#2a2a2a] w-fit overflow-hidden">
            <button
              onClick={() => updateNodeData(selectedNode.id, { style: 'accent' })}
              className={`px-4 py-1.5 text-sm ${
                style === 'accent' ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'
              }`}
            >
              Accent
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { style: 'fill' })}
              className={`px-4 py-1.5 text-sm ${
                style === 'fill' ? 'bg-[#2d2d2d] text-white' : 'text-gray-500'
              }`}
            >
              Fill
            </button>
          </div>
        </div>

        {/* Shape */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Shape</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateNodeData(selectedNode.id, { nodeShape: 'square' })}
              className={`px-4 py-1.5 text-sm rounded-full border flex items-center justify-center ${
                nodeShape === 'square'
                  ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                  : 'border-[#2a2a2a] text-gray-400 hover:text-white'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateNodeData(selectedNode.id, { nodeShape: 'rectangle' })}
              className={`px-4 py-1.5 text-sm rounded-full border flex items-center justify-center ${
                nodeShape === 'rectangle'
                  ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                  : 'border-[#2a2a2a] text-gray-400 hover:text-white'
              }`}
            >
              <RectangleHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

      </>
    );
  };

  const renderRiveInput = (nodeType: string) => {
    let labelName = "";
    let riveSrc = "";
    let stateMachineName = "pose"; // this must match the name in Rive file

    if (nodeType.includes("pose")) {
      labelName = "Pose";
      riveSrc = "/rive/pose.riv";
    } else if (nodeType.includes("lights")) {
      labelName = "Light Controller";
      riveSrc = "/rive/lights.riv";
    } else {
      return null;
    }

    const { rive, RiveComponent } = useRive({
      src: riveSrc,
      autoplay: true,
      stateMachines: stateMachineName,
      artboard: "Default",
    });

    // Example of accessing an input
    const toggleInput = useStateMachineInput(
      rive,
      stateMachineName,
      "Toggle" // this must match the name of the input defined in Rive
    );

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">{labelName}</label>
        <div
          className="w-full aspect-video rounded-md overflow-hidden border border-gray-700 cursor-pointer"
          onClick={() => {
            // Example: trigger an input
            if (toggleInput?.fire) toggleInput.fire(); // for Trigger input
            if (toggleInput?.value !== undefined) toggleInput.value = !toggleInput.value; // for Boolean input
          }}
        >
          <RiveComponent />
        </div>
      </div>
    );
  };

  const RiveWrapper = ({ nodeType }: { nodeType: string }) => {
    const riveSrc =
      nodeType === "control-net-pose" ? "/rive/pose.riv"
      : nodeType === "control-net-lights" ? "/rive/lights.riv"
      : null;

    const stateMachineName =
      nodeType === "control-net-pose" ? "PoseMachine"
      : nodeType === "control-net-lights" ? "LightsMachine"
      : null;

    const { rive, RiveComponent } = useRive({
      src: riveSrc || "",
      stateMachines: stateMachineName || "",
      autoplay: true,
      artboard: "Default",
    });

    // Still declare inputs (they just may be `undefined`)
    const trigger = useStateMachineInput(rive, stateMachineName || "", "Activate");

    if (!riveSrc || !stateMachineName) return null;

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {nodeType.includes("pose") ? "Pose" : "Light Controller"}
        </label>
        <div
          className="w-full aspect-video rounded-md overflow-hidden border border-gray-700"
          onClick={() => {
            trigger?.fire?.();
          }}
        >
          <RiveComponent />
        </div>
      </div>
    );
  };

  const renderEngineInput = () => {
    if (!selectedNode?.data?.right_sidebar) return null;

    const { right_sidebar } = selectedNode.data;
    const { image_url, accident, quality, ratio, size } = right_sidebar;

    const ratioOptions = ['1:1', '3:4', '4:3', '9:16', '16:9'];

    return (
      <>
       <label className="block text-md font-bold text-gray-300 mb-2">Engine</label>
        {renderImage(image_url)}
        {/* Accident */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Accident</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={accident || 0}
              min={0}
              max={1000}
              step={1}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    accident: parseInt(e.target.value),
                  },
                })
              }
              className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-200"
            />
            <button className="bg-[#2a2a2a] text-gray-300 p-2 rounded-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2M16 20h2a2 2 0 0 0 2-2v-2M8 4H6a2 2 0 0 0-2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quality */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Quality</label>
          <div className="flex items-center gap-2">
            <select
              value={quality || 5}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    quality: parseInt(e.target.value),
                  },
                })
              }
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-sm text-gray-300 rounded-md px-2 py-1"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <input
              type="range"
              min={1}
              max={10}
              value={quality || 5}
              onChange={(e) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    quality: parseInt(e.target.value),
                  },
                })
              }
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Ratio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Ratio</label>
          <div className="flex items-center justify-between gap-1 bg-[#1e1e1e] p-1 rounded-full border border-[#2a2a2a]">
            {ratioOptions.map((r) => (
              <button
                key={r}
                onClick={() =>
                  updateNodeData(selectedNode.id, {
                    right_sidebar: {
                      ...right_sidebar,
                      ratio: r,
                    },
                  })
                }
                className={`text-xs px-3 py-1.5 rounded-full transition ${
                  ratio === r
                    ? 'bg-[#2d2d2d] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="mb-2 py-4 ">
          <label className="block text-sm font-medium text-gray-300 mb-1">Size</label>
          <div className="flex gap-2">
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2 w-full">
              <input
                type="number"
                value={size?.width || ''}
                min={64}
                max={8192}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    right_sidebar: {
                      ...right_sidebar,
                      size: {
                        ...right_sidebar.size,
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
            <div className="flex items-center bg-[#1e1e1e] border border-[#2a2a2a] rounded-md px-3 py-2 w-full">
              <input
                type="number"
                value={size?.height || ''}
                min={64}
                max={8192}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    right_sidebar: {
                      ...right_sidebar,
                      size: {
                        ...right_sidebar.size,
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
    const { image_url, power = 70, tags = [] } = right_sidebar;

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
                    ...right_sidebar,
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
                    ...right_sidebar,
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
    (selectedNode?.data?.right_sidebar && property in selectedNode.data?.right_sidebar);
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
            value={selectedNode.data.label || ''}
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
            {renderSlider('Fingers Left', 'fingers.left', 0, 100, 1)}
            {renderSlider('Fingers Right', 'fingers.right', 0, 100, 1)}
            {renderSlider('Shoulders Left', 'shoulders.left', 0, 100, 1)}
            {renderSlider('Shoulders Right', 'shoulders.right', 0, 100, 1)}
            {renderSlider('Elbow Left', 'elbow.left', 0, 100, 1)}
            {renderSlider('Elbow Right', 'elbow.right', 0, 100, 1)}
            {renderSlider('Hip Left', 'hip.left', 0, 100, 1)}
            {renderSlider('Hip Right', 'hip.right', 0, 100, 1)}
            {renderSlider('Knee Left', 'knee.left', 0, 100, 1)}
            {renderSlider('Knee Right', 'knee.right', 0, 100, 1)}
            {renderSlider('Ankle Left', 'ankle.left', 0, 100, 1)}
            {renderSlider('Ankle Right', 'ankle.right', 0, 100, 1)}
            {renderSlider('Neck', 'neck', 0, 100, 1)}
            {renderSlider('Head', 'head', 0, 100, 1)}
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
            {renderTextInput('Image', 'image')}
            {renderTypeInput()}
            {renderNodeDesignInput()}
          </>
        );
        
      case 'control-net-lights':
        return (
          <>
            {renderNodePositionInputs()}
            {renderTextInput('Blend', 'blend')}
            {renderTextInput('Image', 'image')}
            {renderSlider('Power', 'power', 0, 100, 1)}
            {renderColorInput('Color', 'color')}
            {renderSlider('Length', 'length', 0, 1000, 10)}
            {renderSlider('Width', 'width', 0, 1000, 10)}
            {renderNumericInput('Location X', 'location.x', 0, 1000, 10)}
            {renderNumericInput('Location Y', 'location.y', 0, 1000, 10)}
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
                value={selectedNode.data.type || 'source'}
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
                  checked={selectedNode.data.enhance || false}
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
                value={selectedNode.data.ratio || 'Outpaint'}
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
    <div className={selectedNode ? "w-80 h-full bg-[#0d0d0d] border-l border-field flex flex-col overflow-hidden" : "w-80 h-full bg-[#0d0d0d] border-l border-field"}>
      
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