import React, { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Node } from '@xyflow/react';
import { NodeType } from '@/store/types';

import { DndContext } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'; // Use sortable's arrayMove for consistency
import { CSS } from '@dnd-kit/utilities'; // Optional for smooth animations
import Sortable from 'sortablejs';
import { getHighestOrder } from '@/store/nodeActions';



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

export const LeftSidebar = ({activeTab, setActiveTab}) => {

  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const {getNodes, setNodes} = useReactFlow()
  
  // Get nodes from the canvas
  const canvasNodes = useCanvasStore(state => state.nodes);
  const canvasEdges = useCanvasStore(state => state.edges);
  const [currentSelectedNode, setCurrentSelectedNode] = useState(null);
  const { setSelectedNode, setSelectedNodeById } = useCanvasStore();

  
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Inputs': true,
    'Models': true,
    'LoRAs': false,
    'ControlNets': true,
    'Output': true,
    'Components': true,
    'Renders': false,
    'Uploaded': false
  });

  // Track expanded nodes in the outline view
  const [expandedNodes, setExpandedNodes] = useState({});
  const sortableRef = useRef(null);
  const [hierarchy, setHierarchy] = useState({ topLevelNodes: [], parentToChildrenMap: {} });

  useEffect(() => {
    const result = organizeHierarchy();
    setHierarchy(result);
  }, [canvasNodes, canvasEdges]);

  useEffect(()=>{

  },[getNodes(), getNodes().length])
  
  
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
        { name: 'Render 1', type: 'render', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Render 2', type: 'render', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Render 3', type: 'render', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
        { name: 'Render 4', type: 'render', image: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb' },
        { name: 'Render 5', type: 'render', image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22' },
        { name: 'Render 6', type: 'render', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' },
      ] as AssetItem[]
    },
    {
      name: 'Uploaded',
      icon: Shuffle,
      items: [
        { name: 'Upload 1', type: 'upload', image: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7' },
        { name: 'Upload 2', type: 'upload', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Upload 3', type: 'upload', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Upload 4', type: 'upload', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
      ] as AssetItem[]
    }
  ];
  
  // Toggle expanded state of a node
  const toggleNodeExpanded = (nodeId: string) => {
    console.log('toggle node expanded attempted')
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // Get node icon based on node type
  const getNodeIcon = (nodeType: string | undefined) => {
    if (!nodeType) return <div className="w-4 h-4 rounded-sm bg-gray-400"></div>;
    
    if (nodeType?.includes('model')) return <Cpu className="h-4 w-4 mr-2 text-blue-400" />;
    if (nodeType?.includes('lora')) return <Layers className="h-4 w-4 mr-2 text-purple-400" />;
    if (nodeType?.includes('controlnet')) return <ImageIcon className="h-4 w-4 mr-2 text-green-400" />;
    if (nodeType?.includes('input')) return <Type className="h-4 w-4 mr-2 text-yellow-400" />;
    if (nodeType?.includes('output') || nodeType?.includes('preview')) return <FileOutput className="h-4 w-4 mr-2 text-pink-400" />;
    
    return <div className="w-4 h-4 rounded-sm bg-gray-400"></div>;
  };
  
  /**
   * Enhanced hierarchical organization logic:
   * - Builds a complete dependency tree based on edge connections
   * - Any node that receives connections from other nodes is considered a parent
   * - This creates a natural hierarchy based on dataflow in the canvas
   */

  const SortableNode = ({ node, parentToChildrenMap, level }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      paddingLeft: `${level * 16 + 8}px`
      };
      const hasChildren = parentToChildrenMap[node.id]?.length > 0;

      return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
          {renderNode(node, parentToChildrenMap, level)}
        </div>
      );
  };


  // const handleDragEnd = ({ active, over }) => {
  //   if (!active || !over || active.id === over.id) return;

  //   const { topLevelNodes, parentToChildrenMap } = organizeHierarchy();
  //   const nodes = useCanvasStore.getState().nodes;

  //   const findSubtree = (nodeId, subtree = []) => {
  //     const node = nodes.find(n => n.id === nodeId);
  //     if (node) subtree.push(node);
  //     const children = parentToChildrenMap[nodeId] || [];
  //     children.forEach(child => findSubtree(child.id, subtree));
  //     return subtree;
  //   };

  //   // Create a flat list of all nodes
  //   const flatList = [...topLevelNodes];
  //   Object.keys(parentToChildrenMap).forEach(parentId => {
  //     parentToChildrenMap[parentId].forEach(child => {
  //       if (!flatList.includes(child)) flatList.push(child);
  //     });
  //   });

  //   // Build a mapping of nodeId to its subtree or just itself
  //   const nodeToSubtree = {};
  //   flatList.forEach(node => {
  //     if (parentToChildrenMap[node.id]) {
  //       nodeToSubtree[node.id] = findSubtree(node.id);
  //     } else if (!Object.values(parentToChildrenMap).flat().some(n => n.id === node.id)) {
  //       nodeToSubtree[node.id] = [node]; // Independent node
  //     }
  //   });

  //   // Rebuild the ordered list
  //   const oldIndex = flatList.findIndex(n => n.id === active.id);
  //   const newIndex = flatList.findIndex(n => n.id === over.id);
  //   const updatedList = [...flatList];

  //   const [movedNodes] = updatedList.splice(oldIndex, 1);
  //   const subtree = nodeToSubtree[active.id] || [movedNodes];
  //   updatedList.splice(newIndex, 0, ...subtree);

  //   // Deduplicate by node ID
  //   const deduped = [];
  //   const seen = new Set();
  //   updatedList.forEach(node => {
  //     if (!seen.has(node.id)) {
  //       deduped.push(node);
  //       seen.add(node.id);
  //     }
  //   });

  //   // Update orders
  //   deduped.map((node, idx) => {
  //     node.data = { ...node.data, order: deduped.length - idx };
  //   });

  //   setNodes(deduped);
  // };


  const handleDragEnd = ({ active, over }) => {
    if (!active || !over || active.id === over.id) return;

    const { topLevelNodes, parentToChildrenMap } = organizeHierarchy();
    const nodes = useCanvasStore.getState().nodes;

    const findSubtree = (nodeId, subtree = []) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) subtree.push(node);
      const children = parentToChildrenMap[nodeId] || [];
      children.forEach(child => findSubtree(child.id, subtree));
      return subtree;
    };

    // Create a flat list preserving hierarchy grouping
    let flatList = [];
    topLevelNodes.forEach(topNode => {
      if (parentToChildrenMap[topNode.id]) {
        flatList.push(...findSubtree(topNode.id));
      } else {
        flatList.push(topNode);
      }
    });

    // Find the subtree of the node being moved
    const activeSubtree = findSubtree(active.id);

    // Remove all nodes in the active subtree from the flat list
    flatList = flatList.filter(node => !activeSubtree.some(subNode => subNode.id === node.id));

    // Find the index of the target node in the flat list
    const overIndex = flatList.findIndex(n => n.id === over.id);

    // Insert the active subtree at the new index
    flatList.splice(overIndex, 0, ...activeSubtree);

    // Deduplicate to prevent scattered nodes
    const seen = new Set();
    const deduped = flatList.filter(node => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });

    // Update orders (maintain parent-child relative order)
    deduped.forEach((node, idx) => {
      node.data = { ...node.data, order: idx }; // 0-based order
    });

    // Set updated nodes
    setNodes(deduped);
  };


  const organizeHierarchy = () => {
    const parentToChildrenMap: Record<string, Node[]> = {};
    const childrenSet = new Set<string>();

    const frames = canvasNodes.filter(n => n.type === 'labeledFrameGroupNode');

    const isNodeInsideFrame = (node: Node, frame: Node): boolean => {
      if (!frame.width || !frame.height) return false;
      return (
        node.position.x >= frame.position.x &&
        node.position.y >= frame.position.y &&
        node.position.x <= frame.position.x + frame.width &&
        node.position.y <= frame.position.y + frame.height
      );
    };

    // 🏠 Add nodes inside frames to hierarchy
    canvasNodes.forEach(node => {
      if (node.type !== 'labeledFrameGroupNode') {
        const parentFrame = frames.find(frame => isNodeInsideFrame(node, frame));
        if (parentFrame) {
          if (!parentToChildrenMap[parentFrame.id]) parentToChildrenMap[parentFrame.id] = [];
          parentToChildrenMap[parentFrame.id].push(node);
          childrenSet.add(node.id);
        }
      }
    });

    // 🔗 Edge-based grouping (as-is)
    canvasEdges.forEach(edge => {
      const source = canvasNodes.find(n => n.id === edge.source);
      const target = canvasNodes.find(n => n.id === edge.target);
      if (source && target) {
        if (!parentToChildrenMap[target.id]) parentToChildrenMap[target.id] = [];
        if (!parentToChildrenMap[target.id].some(n => n.id === source.id)) {
          parentToChildrenMap[target.id].push(source);
          childrenSet.add(source.id);
        }
      }
    });

    // 🔢 Top-level nodes
    const topLevelNodes = canvasNodes
      .filter(n => !childrenSet.has(n.id))
      .sort((a, b) => (b.data?.order ?? 0) - (a.data?.order ?? 0));

    return { topLevelNodes, parentToChildrenMap };
  };





  useEffect(() => {
    if (sortableRef.current) {
      const sortable = Sortable.create(sortableRef.current, {
        animation: 150,
        onEnd: (evt) => {
          handleDragEnd({ 
            active: { id: sortableRef.current.children[evt.oldIndex].dataset.id },
            over: { id: sortableRef.current.children[evt.newIndex].dataset.id }
          });
        }

      });

      return () => sortable.destroy();
    }
  }, [hierarchy.topLevelNodes]);



  const moveNodeInOrder = (draggedId, targetId) => {
    const nodes = [...useCanvasStore.getState().nodes];
    const dragged = nodes.find(n => n.id === draggedId);
    const target = nodes.find(n => n.id === targetId);
    if (!dragged || !target) return;

    // Swap their order values
    const temp = dragged.data?.order ?? 0;
    dragged.data = { ...dragged.data, order: target.data?.order ?? 0 };
    target.data = { ...target.data, order: temp };

    useCanvasStore.getState().setNodes(nodes);
  };


  // const renderNode = (node: Node, parentToChildrenMap: Record<string, Node[]>, level: number = 0) => {
    
  //   const nodeId = node.id;
  //   const hasChildren = parentToChildrenMap[nodeId] && parentToChildrenMap[nodeId]?.length > 0;
  //   const isExpanded = expandedNodes[nodeId] !== false;
  //   const order = node.data?.order ?? 0;

  //   return (
  //     <div key={nodeId} className="mb-1" style={{ order: order * -1 }}> {/* Reverse ordering for CSS flex/grid */}
  //       <div
  //         className={`p-2 rounded-md flex items-center cursor-pointer transition-colors duration-150
  //           ${useCanvasStore.getState().selectedNode?.id === nodeId ? 
  //               'bg-blue-900/40 text-blue-200'
  //             : 'hover:bg-gray-700/50 text-gray-200'}`}
  //         style={{ paddingLeft: `${level * 16 + 8}px` }}
  //         onClick={() => {
  //            const selected = canvasNodes.find(n => n.id === nodeId);
  //            if (selected) {
  //              useCanvasStore.getState().setSelectedNode(selected);
  //              useCanvasStore.getState().setSelectedNodeById(nodeId);
  //          }
  //         }}
  //       >
  //         {hasChildren ? (
  //           <Button
  //             className="mr-1 p-1 rounded-sm hover:bg-gray-600/50"
  //             onClick={() => {
  //               console.log("Left Side bar Chevron Down Clicked")
  //               toggleNodeExpanded(nodeId);
  //             }}
  //           >
  //             {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" onClick={()=>console.log('test')}/> 
  //               : 
  //               <ChevronRight className="h-3 w-3 text-gray-400" />}
  //           </Button>
  //         ) : <div className="w-4 mr-1 bg-red-500" />}

  //         {getNodeIcon(node.type)}
  //         <span className="text-sm font-medium truncate flex-1">
  //           {String(node.data?.displayName || node.type || node.id)}
  //         </span>
  //       </div>

  //       {hasChildren && isExpanded && parentToChildrenMap[nodeId].map(childNode =>
  //         renderNode(childNode, parentToChildrenMap, level + 1)
  //       )}
  //     </div>
  //   );
  // };

  const renderNode = (node, level = 0) => {
    const hasChildren = parentToChildrenMap[node.id]?.length > 0;
    const isExpanded = expandedNodes[node.id] !== false;

    return (
      <div key={node.id} className="mb-1" data-id={node.id}>
        <div
          className={node.selected ? 
            "p-2 flex items-center cursor-pointer rounded-t-xl rounded-s-md bg-blue-600  border-t border-white" : 
            "p-2 flex items-center cursor-pointer rounded-t-xl rounded-s-md hover:bg-gray-800/50 hover:border-t hover:border-white"}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            const selected = canvasNodes.find(n => n.id === node.id);
            if (selected) {              
              setSelectedNode(selected)
              setSelectedNodeById(selected)
              setCurrentSelectedNode(selected)
            }
          }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNodeExpanded(node.id); }} className="mr-1">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : <span className="w-4 mr-1" />}
          <span>{node.data?.displayName || node.type}</span>
        </div>
        {hasChildren && isExpanded && parentToChildrenMap[node.id].map(child =>
          renderNode(child, level + 1)
        )}
      </div>
    );
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
  const { topLevelNodes, parentToChildrenMap } = organizeHierarchy();

  // Handler for adding a node
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
    
    const order = getHighestOrder(getNodes())+1;
    addNode(nodeType, position, order);
  };
  
  return (
    <div className="w-16 lg:w-64 h-full bg-sidebar border-r border-gray-700 flex flex-col overflow-hidden transition-all duration-200">
      {/* Tab selector */}
      <div className="flex justify-center items-center bg-transparent py-2">
        <div className="flex bg-[#1f1f1f] rounded-full p-1">
          {['Outline', 'Insert', 'Assets'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'Outline' | 'Insert' | 'Assets')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${activeTab === tab
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      
      {/* Search bar */}
      <div className="p-2 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2 
              bg-[#1f1f1f] text-sm text-white 
              placeholder:text-gray-400 
              border-none rounded-full 
              focus:ring-2 focus:ring-blue-500 focus:outline-none
              transition duration-200 ease-in-out
            "
          />
        </div>
      </div>

      
      {/* Scrollable content area - implementing the user's solution */}
      <ScrollArea className="h-[calc(90vh-112px)] overflow-y-auto">
        <div className="p-2 lg:p-4">
          {/* Outline Tab - Hierarchical Workflow Components */}
          {activeTab === 'Outline' && (
            <div>
              <h3 className="text-sm text-gray-400 mb-3 ml-1 flex items-center justify-between">
                <div className="flex items-center">
                  <LayoutList className="h-4 w-4 mr-2" />
                  <span className="font-medium">Workflow Components</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-700">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </h3>
              
          <div ref={sortableRef}>
            {topLevelNodes.map(node => renderNode(node))}
          </div>
            </div>
          )}
          
          {/* Insert Tab - Node Categories */}
          {activeTab === 'Insert' && !searchTerm && (
            <div className="space-y-8">
              {insertCategories.map((category) => (
                <div key={category.name} className="mb-8">
                  <div className="node-category-title flex items-center mb-2">
                    <category.icon className="h-4 w-4 mr-2" />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {category.options.map((option) => (
                        <div 
                          key={option.type}
                          onClick={() => handleAddNode(option.type)}
                          className="node-option bg-gray-800 p-3 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex flex-col items-center">
                            <div className="node-option-icon mb-2">
                              <option.icon className="h-6 w-6 text-blue-400" />
                            </div>
                            <span className="text-sm text-center font-medium text-white tracking-tight">{option.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                <div className="grid grid-cols-2 gap-2">
                  {filterNodeOptions(allNodeOptions).map((option) => (
                    <div 
                      key={option.type}
                      onClick={() => handleAddNode(option.type)}
                      className="node-option p-3 cursor-pointer"
                    >
                      <div className="flex flex-col items-center">
                        <div className="node-option-icon mb-2">
                          <option.icon className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-xs text-center font-medium text-white">{option.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
      </ScrollArea>
    </div>
  );
};
