import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { 
  Cpu, 
  Layers, 
  Image as ImageIcon, 
  Type, 
  FileOutput, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  LayoutList,
  SquarePlus,
  FileImage,
  Shuffle,
  Search,
  PlusCircle
} from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import { Node } from '@xyflow/react';
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

type AssetItem = {
  name: string;
  type: string;
  image?: string;
};

export const LeftSidebar = () => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const [activeTab, setActiveTab] = useState<'Outline' | 'Insert' | 'Assets'>('Insert');
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Inputs': true,
    'Models': false,
    'LoRAs': false,
    'ControlNets': false,
    'Output': false,
    'Components': true,
    'Renders': false,
    'Uploaded': false
  });
  
  const insertCategories: NodeCategory[] = [
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

  // Demo content for Assets tab
  const assetCategories = [
    {
      name: 'Components',
      icon: LayoutList,
      items: [
        { name: 'Component 1', type: 'component' },
        { name: 'Component 2', type: 'component' },
        { name: 'Untitled Component', type: 'component' },
      ] as AssetItem[]
    },
    {
      name: 'Renders',
      icon: FileImage,
      items: [
        { name: 'Render 1', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475', type: 'render' },
        { name: 'Render 2', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5', type: 'render' },
        { name: 'Render 3', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', type: 'render' },
        { name: 'Render 4', image: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb', type: 'render' },
        { name: 'Render 5', image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22', type: 'render' },
        { name: 'Render 6', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901', type: 'render' },
      ] as AssetItem[]
    },
    {
      name: 'Uploaded',
      icon: Shuffle,
      items: [
        { name: 'Upload 1', image: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7', type: 'upload' },
        { name: 'Upload 2', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475', type: 'upload' },
        { name: 'Upload 3', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5', type: 'upload' },
        { name: 'Upload 4', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158', type: 'upload' },
      ] as AssetItem[]
    }
  ];

  // Get nodes from the canvas
  const canvasNodes = useCanvasStore(state => state.nodes);
  
  // Organize nodes into hierarchical structure for the outline
  const organizeHierarchy = (nodes: Node[]) => {
    const rootNodes: Node[] = [];
    const childrenMap: Record<string, Node[]> = {};
    
    // First pass: Identify parent-child relationships based on connections
    const edges = useCanvasStore.getState().edges;
    
    edges.forEach(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;
      
      if (!childrenMap[sourceId]) {
        childrenMap[sourceId] = [];
      }
      
      const targetNode = nodes.find(n => n.id === targetId);
      if (targetNode) {
        childrenMap[sourceId].push(targetNode);
      }
    });
    
    // Second pass: Identify root nodes (nodes that are not children of any other nodes)
    const childIds = Object.values(childrenMap).flat().map(node => node.id);
    
    nodes.forEach(node => {
      if (!childIds.includes(node.id)) {
        rootNodes.push(node);
      }
    });
    
    return { rootNodes, childrenMap };
  };

  const renderNodeHierarchy = (node: Node, childrenMap: Record<string, Node[]>, level = 0) => {
    const hasChildren = childrenMap[node.id] && childrenMap[node.id].length > 0;
    const nodeType = node.type as string || '';
    
    return (
      <div key={node.id} className="mb-1">
        <div 
          className="p-2 bg-gray-800 rounded-md flex items-center cursor-pointer hover:bg-gray-700"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            // Select the node when clicked
            useCanvasStore.getState().setSelectedNode(node);
          }}
        >
          {nodeType?.includes('model') && <Cpu className="h-4 w-4 mr-2 text-blue-400" />}
          {nodeType?.includes('lora') && <Layers className="h-4 w-4 mr-2 text-purple-400" />}
          {nodeType?.includes('controlnet') && <ImageIcon className="h-4 w-4 mr-2 text-green-400" />}
          {nodeType?.includes('input') && <Type className="h-4 w-4 mr-2 text-yellow-400" />}
          {nodeType?.includes('output') && <FileOutput className="h-4 w-4 mr-2 text-pink-400" />}
          <span className="text-sm truncate">
            {String(node.data.displayName || node.id)}
          </span>
          {hasChildren && (
            <ChevronDown className="h-3 w-3 ml-auto text-gray-400" />
          )}
        </div>
        
        {hasChildren && childrenMap[node.id].map((childNode) => 
          renderNodeHierarchy(childNode, childrenMap, level + 1)
        )}
      </div>
    );
  };
  
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

  // Filter nodes based on search term
  const filterNodeOptions = (options: NodeOption[]) => {
    if (!searchTerm) return options;
    
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  // Create a flat list of all options for search
  const allNodeOptions = insertCategories.flatMap(category => category.options);
  
  const { rootNodes, childrenMap } = organizeHierarchy(canvasNodes);
  
  return (
    <div className="w-16 lg:w-64 h-full bg-sidebar border-r border-field flex flex-col overflow-hidden transition-all duration-200">
      {/* Tab selector */}
      <div className="flex border-b border-gray-700 bg-sidebar-accent">
        <button 
          className={`flex-1 py-3 px-2 text-center text-sm font-medium ${activeTab === 'Outline' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('Outline')}
        >
          <div className="flex flex-col items-center justify-center">
            <LayoutList className="h-5 w-5 mb-1" />
            <span className="hidden lg:inline">Outline</span>
          </div>
        </button>
        <button 
          className={`flex-1 py-3 px-2 text-center text-sm font-medium ${activeTab === 'Insert' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('Insert')}
        >
          <div className="flex flex-col items-center justify-center">
            <SquarePlus className="h-5 w-5 mb-1" />
            <span className="hidden lg:inline">Insert</span>
          </div>
        </button>
        <button 
          className={`flex-1 py-3 px-2 text-center text-sm font-medium ${activeTab === 'Assets' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('Assets')}
        >
          <div className="flex flex-col items-center justify-center">
            <FileImage className="h-5 w-5 mb-1" />
            <span className="hidden lg:inline">Assets</span>
          </div>
        </button>
      </div>
      
      {/* Search bar */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 bg-gray-800 border-gray-700 text-sm h-9"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 lg:p-4">
        {/* Outline Tab - Hierarchical Workflow Components */}
        {activeTab === 'Outline' && (
          <div>
            <h3 className="text-sm text-gray-400 mb-3 ml-1 flex items-center justify-between">
              <div className="flex items-center">
                <LayoutList className="h-4 w-4 mr-2" />
                <span>Workflow Components</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </h3>
            
            <div className="space-y-1">
              {rootNodes.length > 0 ? (
                rootNodes.map(node => renderNodeHierarchy(node, childrenMap))
              ) : (
                <div className="text-gray-500 text-sm p-2 italic">
                  No components in workflow yet. Add some from the Insert tab.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Insert Tab - Node Categories (with search filter) */}
        {activeTab === 'Insert' && !searchTerm && (
          <div className="grid grid-cols-2 gap-2">
            {insertCategories.map((category) => (
              <div key={category.name} className="mb-4">
                <div className="flex items-center mb-2 text-gray-300 font-medium">
                  <category.icon className="h-4 w-4 mr-2" />
                  <span>{category.name}</span>
                </div>
                <div className="space-y-1 pl-1">
                  {category.options.map((option) => (
                    <div 
                      key={option.type}
                      className="p-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 flex items-center"
                      onClick={() => handleAddNode(option.type)}
                    >
                      <option.icon className="h-4 w-4 mr-2" />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Search Results */}
        {activeTab === 'Insert' && searchTerm && (
          <div className="space-y-2">
            <h3 className="text-sm text-gray-400 mb-3">Search results for "{searchTerm}"</h3>
            {filterNodeOptions(allNodeOptions).length > 0 ? (
              filterNodeOptions(allNodeOptions).map((option) => (
                <div 
                  key={option.type}
                  className="p-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 flex items-center"
                  onClick={() => handleAddNode(option.type)}
                >
                  <option.icon className="h-4 w-4 mr-2" />
                  <span className="text-sm">{option.label}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {insertCategories.find(c => c.options.some(o => o.type === option.type))?.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm p-2 italic">
                No components match your search.
              </div>
            )}
          </div>
        )}
        
        {/* Assets Tab - Images and Components */}
        {activeTab === 'Assets' && (
          <div className="space-y-6">
            {assetCategories.map((category) => (
              <div key={category.name}>
                <Collapsible 
                  open={openCategories[category.name]} 
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger className="flex items-center w-full text-left mb-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-blue-400">
                        {openCategories[category.name] ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </span>
                      <category.icon className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="pl-6 space-y-2">
                    {category.items
                      .filter(item => 
                        !searchTerm || 
                        item.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((item, index) => (
                        <div key={index}>
                          {item.type === 'component' ? (
                            <div className="flex items-center p-2 hover:bg-gray-700 rounded-md">
                              <div className="w-4 h-4 bg-purple-500 rounded-sm mr-2"></div>
                              <span className="text-sm text-gray-300">{item.name}</span>
                            </div>
                          ) : (
                            <div className="mb-2">
                              {item.image && (
                                <div className="relative group">
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
