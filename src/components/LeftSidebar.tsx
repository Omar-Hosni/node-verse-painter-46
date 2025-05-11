
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { Cpu, Layers, Image as ImageIcon, Type, FileOutput, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NodeType } from '@/store/types';

type NodeOption = {
  type: NodeType;
  label: string;
  icon: React.ElementType;
  description: string;
};

type NodeCategory = {
  name: string;
  icon: React.ElementType;
  options: NodeOption[];
};

export const LeftSidebar = () => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Inputs': true,
    'Models': false,
    'LoRAs': false,
    'ControlNets': false,
    'Output': false
  });
  
  const nodeCategories: NodeCategory[] = [
    { 
      name: 'Inputs',
      icon: Type,
      options: [
        { 
          type: 'input-text', 
          label: 'Text Input', 
          icon: Type,
          description: 'A node that allows entering text which can be used as prompts for models.' 
        },
        { 
          type: 'input-image', 
          label: 'Image Input', 
          icon: ImageIcon,
          description: 'A node that allows uploading images for use in ControlNet or as reference.' 
        },
      ]
    },
    {
      name: 'Models',
      icon: Cpu,
      options: [
        { 
          type: 'model-sdxl', 
          label: 'SDXL', 
          icon: Cpu,
          description: 'Stable Diffusion XL model that generates high-quality images from text prompts.' 
        },
        { 
          type: 'model-flux', 
          label: 'Flux Model', 
          icon: Cpu,
          description: 'Flux model specialized for dynamic and fluid-like image generation.' 
        },
        { 
          type: 'model-hidream', 
          label: 'HiDream Model', 
          icon: Cpu,
          description: 'HiDream model for highly detailed dream-like imagery.' 
        },
      ]
    },
    {
      name: 'LoRAs',
      icon: Layers,
      options: [
        { 
          type: 'lora-realistic', 
          label: 'Realistic LoRA', 
          icon: Layers,
          description: 'LoRA adapter that enhances realism in generated images.' 
        },
        { 
          type: 'lora-cartoon', 
          label: 'Cartoon LoRA', 
          icon: Layers,
          description: 'LoRA adapter that creates cartoon-style imagery.' 
        },
        { 
          type: 'lora-character', 
          label: 'Character X LoRA', 
          icon: Layers,
          description: 'LoRA adapter that specializes in consistent character generation.' 
        },
      ]
    },
    {
      name: 'ControlNets',
      icon: ImageIcon,
      options: [
        { 
          type: 'controlnet-canny', 
          label: 'Canny ControlNet', 
          icon: ImageIcon,
          description: 'ControlNet that uses edge detection to guide image generation.' 
        },
        { 
          type: 'controlnet-depth', 
          label: 'Depth ControlNet', 
          icon: ImageIcon,
          description: 'ControlNet that uses depth information to guide image generation.' 
        },
        { 
          type: 'controlnet-pose', 
          label: 'Pose ControlNet', 
          icon: ImageIcon,
          description: 'ControlNet that uses human pose information to guide image generation.' 
        },
        { 
          type: 'controlnet-segment', 
          label: 'Segment ControlNet', 
          icon: ImageIcon,
          description: 'ControlNet that uses segmentation maps to guide image generation.' 
        },
      ]
    },
    {
      name: 'Output',
      icon: FileOutput,
      options: [
        { 
          type: 'output-preview', 
          label: 'Preview', 
          icon: FileOutput,
          description: 'A node that displays the final generated image output.' 
        },
      ]
    }
  ];

  const handleAddNode = (nodeType: NodeType) => {
    // Get the center of the viewport
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

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  return (
    <div className="w-16 lg:w-64 h-full bg-sidebar border-r border-field flex flex-col overflow-hidden transition-all duration-200">
      <div className="flex-1 overflow-y-auto p-2 lg:p-4">
        <div className="grid grid-cols-1 gap-2 mb-6">
          {nodeCategories.map((category) => (
            <Collapsible 
              key={category.name}
              open={openCategories[category.name]} 
              onOpenChange={() => toggleCategory(category.name)}
              className="w-full"
            >
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center justify-center lg:justify-between bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full w-full"
                  >
                    <div className="flex items-center">
                      <category.icon className="h-5 w-5 lg:mr-2" />
                      <span className="hidden lg:inline text-sm">{category.name}</span>
                    </div>
                    <div className="hidden lg:flex items-center">
                      {openCategories[category.name] ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 text-white hover:bg-gray-600 rounded-full h-8 w-8"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-gray-800 border-gray-700 text-white">
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold">{category.name}</h4>
                      <p className="text-sm text-gray-300">
                        {category.name === 'Inputs' && 'Nodes for text and image inputs.'}
                        {category.name === 'Models' && 'Different AI models for image generation.'}
                        {category.name === 'LoRAs' && 'Low-Rank Adaptation models for specific styles.'}
                        {category.name === 'ControlNets' && 'Controls for guiding image generation.'}
                        {category.name === 'Output' && 'Nodes for displaying generated results.'}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              
              <CollapsibleContent className="px-2 py-2 space-y-2">
                {category.options.map((option) => (
                  <Button 
                    key={option.type}
                    variant="ghost" 
                    className="w-full flex items-center justify-start text-white hover:bg-gray-700 h-10 pl-8"
                    onClick={() => handleAddNode(option.type)}
                  >
                    <option.icon className="h-4 w-4 mr-2" />
                    <span className="text-sm">{option.label}</span>
                  </Button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
};
