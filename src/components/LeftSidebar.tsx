
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { 
  Cpu, 
  Layers, 
  Image as ImageIcon, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Wand2, 
  FlaskConical, 
  Sparkles, 
  Camera, 
  Palette, 
  User,
  Compass 
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const LeftSidebar = () => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleAddNode = (nodeType: any) => {
    // Instead of using project which doesn't exist, we'll use viewport and screenToFlowPosition
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    // Convert screen coordinates to flow coordinates
    const position = reactFlowInstance.screenToFlowPosition({
      x: center.x,
      y: center.y
    });
    addNode(nodeType, position);
  };

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="w-16 lg:w-64 h-screen bg-sidebar border-r border-field flex flex-col overflow-hidden transition-all duration-200">
      <div className="flex-1 overflow-y-auto p-2 lg:p-4">
        <div className="grid grid-cols-1 gap-3 mb-6">
          {/* Inputs Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => toggleSection('inputs')} 
              className="flex items-center justify-between w-full bg-field hover:bg-gray-700 border-none text-white h-12 rounded-lg"
            >
              <div className="flex items-center">
                <ImageIcon className="h-5 w-5 lg:mr-2" />
                <span className="hidden lg:inline">Inputs</span>
              </div>
              {expandedSection === 'inputs' ? 
                <ChevronUp className="h-4 w-4 hidden lg:block" /> : 
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              }
            </Button>
            
            {expandedSection === 'inputs' && (
              <div className="pl-2 space-y-2 animate-fade-in">
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('input-text')}
                  className="flex items-center justify-start w-full bg-[#3498db] hover:bg-[#2980b9] border-none text-white h-10 rounded-md"
                >
                  <FileText className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Text</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('input-image')}
                  className="flex items-center justify-start w-full bg-[#2980b9] hover:bg-[#1f6da8] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Image</span>
                </Button>
              </div>
            )}
          </div>

          {/* Models Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => toggleSection('models')} 
              className="flex items-center justify-between w-full bg-field hover:bg-gray-700 border-none text-white h-12 rounded-lg"
            >
              <div className="flex items-center">
                <Cpu className="h-5 w-5 lg:mr-2" />
                <span className="hidden lg:inline">Models</span>
              </div>
              {expandedSection === 'models' ? 
                <ChevronUp className="h-4 w-4 hidden lg:block" /> : 
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              }
            </Button>
            
            {expandedSection === 'models' && (
              <div className="pl-2 space-y-2 animate-fade-in">
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('model-sdxl')}
                  className="flex items-center justify-start w-full bg-[#8000ff] hover:bg-[#6a00d9] border-none text-white h-10 rounded-md"
                >
                  <Wand2 className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">SDXL</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('model-flux')}
                  className="flex items-center justify-start w-full bg-[#ff8c00] hover:bg-[#e67e00] border-none text-white h-10 rounded-md"
                >
                  <FlaskConical className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Flux</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('model-hidream')}
                  className="flex items-center justify-start w-full bg-[#ff1493] hover:bg-[#e00f83] border-none text-white h-10 rounded-md"
                >
                  <Sparkles className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">HiDream</span>
                </Button>
              </div>
            )}
          </div>

          {/* LoRAs Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => toggleSection('loras')} 
              className="flex items-center justify-between w-full bg-field hover:bg-gray-700 border-none text-white h-12 rounded-lg"
            >
              <div className="flex items-center">
                <Layers className="h-5 w-5 lg:mr-2" />
                <span className="hidden lg:inline">LoRAs</span>
              </div>
              {expandedSection === 'loras' ? 
                <ChevronUp className="h-4 w-4 hidden lg:block" /> : 
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              }
            </Button>
            
            {expandedSection === 'loras' && (
              <div className="pl-2 space-y-2 animate-fade-in">
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('lora-realistic')}
                  className="flex items-center justify-start w-full bg-[#4b0082] hover:bg-[#3a006a] border-none text-white h-10 rounded-md"
                >
                  <Camera className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Realistic</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('lora-cartoon')}
                  className="flex items-center justify-start w-full bg-[#9370db] hover:bg-[#8560cc] border-none text-white h-10 rounded-md"
                >
                  <Palette className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Cartoon</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('lora-character')}
                  className="flex items-center justify-start w-full bg-[#800080] hover:bg-[#700070] border-none text-white h-10 rounded-md"
                >
                  <User className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Character</span>
                </Button>
              </div>
            )}
          </div>

          {/* ControlNets Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => toggleSection('controlnets')} 
              className="flex items-center justify-between w-full bg-field hover:bg-gray-700 border-none text-white h-12 rounded-lg"
            >
              <div className="flex items-center">
                <Compass className="h-5 w-5 lg:mr-2" />
                <span className="hidden lg:inline">ControlNets</span>
              </div>
              {expandedSection === 'controlnets' ? 
                <ChevronUp className="h-4 w-4 hidden lg:block" /> : 
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              }
            </Button>
            
            {expandedSection === 'controlnets' && (
              <div className="pl-2 space-y-2 animate-fade-in">
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('controlnet-canny')}
                  className="flex items-center justify-start w-full bg-[#10b981] hover:bg-[#0ea46f] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Canny</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('controlnet-depth')}
                  className="flex items-center justify-start w-full bg-[#10b981] hover:bg-[#0ea46f] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Depth</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('controlnet-pose')}
                  className="flex items-center justify-start w-full bg-[#10b981] hover:bg-[#0ea46f] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Pose</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('controlnet-segment')}
                  className="flex items-center justify-start w-full bg-[#10b981] hover:bg-[#0ea46f] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Segment</span>
                </Button>
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => toggleSection('outputs')} 
              className="flex items-center justify-between w-full bg-field hover:bg-gray-700 border-none text-white h-12 rounded-lg"
            >
              <div className="flex items-center">
                <ImageIcon className="h-5 w-5 lg:mr-2" />
                <span className="hidden lg:inline">Outputs</span>
              </div>
              {expandedSection === 'outputs' ? 
                <ChevronUp className="h-4 w-4 hidden lg:block" /> : 
                <ChevronDown className="h-4 w-4 hidden lg:block" />
              }
            </Button>
            
            {expandedSection === 'outputs' && (
              <div className="pl-2 space-y-2 animate-fade-in">
                <Button 
                  variant="outline" 
                  onClick={() => handleAddNode('output-preview')}
                  className="flex items-center justify-start w-full bg-[#f59e0b] hover:bg-[#d97706] border-none text-white h-10 rounded-md"
                >
                  <ImageIcon className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline text-sm">Preview</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
