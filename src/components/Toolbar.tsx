// Toolbar.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { Input } from "@/components/ui/input";
import { ZoomControl } from './ZoomControl';
import {
  Hand, 
  MousePointer, 
  Circle as CircleIcon,
  RectangleHorizontal,
  Triangle,
  Text,
  Frame,
  Paintbrush,
  Group,
  MessageCirclePlus,
  Plus,
  Tally1,
  Image,
  Move,
  MousePointerClick,
  Lasso
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getHighestOrder } from '@/store/nodeActions';

type ToolType = 'select' | 'hand' | 'comment' | 'paint' | 'image' | 'circle' | 'rectangle' | 'text' | 'section' | 'labeledGroup' | 'triangle' | 'frame' | 'lasso';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  setActiveTab: (tab) => void;
}


export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, setActiveTab}) => {
  const [isPainting, setIsPainting] = useState(false);
  const addNode = useCanvasStore(state => state.addNode);
  const {getNodes} = useReactFlow()
  const reactFlowInstance = useReactFlow(); //for adding the shapes

  const [sectionWidth, setSectionWidth] = useState(800);
  const [sectionHeight, setSectionHeight] = useState(600);

  const nodes = getNodes()


  const handleOpenInsertTab = () => {
    setActiveTab('Insert'); // Assuming you have this function
  };


  const handleToolChange = (tool: ToolType) => {
      onToolChange(tool); // notify parent
      // const isInteractive = tool !== 'select';
      // reactFlowInstance.setInteractive?.(isInteractive);
  };
  
  const handleAddCommentNode = () => {
    const order = getHighestOrder(getNodes())+1;

    addNode('comment-node', {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      data: {
        type: 'comment-node',
        text: 'New Comment',
        color: '#fcd34d',
        order: order
      }
    });
  };


  const handleAddLayer = (
    type: 'image' | 'circle' | 'rectangle' | 'text' | 'section' | 'triangle' | 'frame',
    dimensions?: { width: number; height: number }
    ) => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
  };

  const position = reactFlowInstance.screenToFlowPosition(center);
  const order = getHighestOrder(getNodes())+1;

  if(type === 'image')
  {
    const imageNode = {
      id: `layer-image-node-${Date.now()}`,
      type: 'layer-image-node', // Matches nodeTypes registration
      position,
      data: {
          displayName: 'Image Input',
          type: 'input-image',
          functionality: 'input',
          order: order,
       },
      width: 300,
      height: 200,
    };
    reactFlowInstance.addNodes?.(imageNode);
    return;
  }

  if (type === 'frame') {
    const frameLabelNode = {
      id: `labeled-frame-node-${Date.now()}`,
      type: 'labeledFrameGroupNode', // Matches nodeTypes registration
      position,
      data: {
        label: "Frame's Label",
        order: order
       },
      width: 300,
      height: 200,
    };
    reactFlowInstance.addNodes?.(frameLabelNode);
    return;
  }

  if (type === 'section') {
    const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected);
    const padding = 40;
    const width = dimensions?.width || 400;
    const height = dimensions?.height || 300;

    const sectionNode = {
      id: `section-${Date.now()}`,
      type: 'section-node',
      position: selectedNodes.length
        ? {
            x: Math.min(...selectedNodes.map(n => n.position.x)) - padding,
            y: Math.min(...selectedNodes.map(n => n.position.y)) - padding,
          }
        : position,
      style: {
        width,
        height,
        border: '2px dashed #999',
        backgroundColor: '#1a1a1a88',
        zIndex: -1,
      },
      data: {
        width,
        height,
        order: order
      },
    };

    reactFlowInstance.addNodes?.(sectionNode);
    return;
  }

  if (type === 'text') {
    addNode('input-text', position, order)
    return
  }

  const shapeNodeTypeMap = {
    rectangle: 'shape-rectangle',
    circle: 'shape-circle',
    triangle: 'shape-triangle',
    labeledFrameGroupNode: 'labeledFrameGroupNode'
  };


  const nodeType = shapeNodeTypeMap[type];
    if (!nodeType) return;

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: {
        order:order,
        type: nodeType
      },
      width: 380,
      height: 200,
    };

    reactFlowInstance.addNodes?.(newNode);
    return;
  };

  return (
    <>
      {/* Bottom toolbar */}
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-2xl px-2 py-2 flex z-100">
        
        <Button
          className=" hover:bg-gray-600"
          onClick={handleOpenInsertTab}
        >
          <Plus strokeWidth={2} color='gray'/>
        </Button>
        
        <svg viewBox="0 0 24 24" width="35">
          <path d="M12 4v16" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
        </svg>

          <Button 
            size="icon" 
            variant={activeTool === 'select' ? "default" : "ghost"}
            className={`rounded-lg ${activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            onClick={() => handleToolChange('select')}
          >
            <MousePointer 
              className="h-4 w-4 text-white scale-125" 
              color={activeTool === 'select' ? 'white' : 'gray'}/>
          </Button>

          <Button 
            size="icon" 
            variant={activeTool === 'hand' ? "default" : "ghost"} 
            className={`rounded-lg  ${activeTool === 'hand' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            onClick={() => handleToolChange('hand')}
          >
            <Hand 
              className="h-4 w-4 text-white scale-125"
              color={activeTool === 'hand' ? 'white' : 'gray'}/>
          </Button>

        <Button
          size="icon"
          variant={activeTool === 'comment' ? "default" : "ghost"}
          className={`rounded-lg ${activeTool === 'comment' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={()=>{
            handleToolChange('comment')
            handleAddCommentNode()
          }}
          >
            <MessageCirclePlus
              className="h-4 w-4 text-white scale-125"
              color={activeTool === 'comment' ? 'white' : 'gray'}/>
          </Button>

        <svg viewBox="0 0 24 24" width="35">
          <path d="M12 4v16" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
        </svg>

        {/* <Tally1 size={30} style={{ transform: 'translateX(30%)', marginTop:'2px', color:"rgba(255, 255, 255, 0.1)"}} /> */}

          <ZoomControl />
      </div>
      
      {/* Top center shape tools */}
      <div className="fixed top-[4.5rem] left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-lg px-2 py-1 flex gap-1 z-10 scale-[110%]">
        <Button
          size="icon"
          variant={activeTool === 'image' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'image' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('image');
            handleAddLayer('image');
          }}
        >
          <Image className={`h-4 w-4 ${activeTool === 'image' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'triangle' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'triangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('triangle');
            handleAddLayer('triangle');
          }}
        >
          <Triangle className={`h-4 w-4 ${activeTool === 'triangle' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'rectangle' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('rectangle');
            handleAddLayer('rectangle');
          }}
        >
          <RectangleHorizontal className={`h-4 w-4 ${activeTool === 'rectangle' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'circle' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('circle');
            handleAddLayer('circle');
          }}
        >
          <CircleIcon className={`h-4 w-4 ${activeTool === 'circle' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'text' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('text');
            handleAddLayer('text');
          }}
        >
          <Text className={`h-4 w-4 ${activeTool === 'text' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'section' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'section' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('section');
            handleAddLayer('section', { width: sectionWidth, height: sectionHeight });
          }}
        >
          <Frame className={`h-4 w-4 ${activeTool === 'section' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'paint' ? "default" : "ghost"}
          className={`rounded-full ${activeTool === 'paint' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => handleToolChange('paint')}
        >
          <Paintbrush className={`h-4 w-4 ${activeTool === 'paint' ? "text-white" : "text-gray-400"}`} />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'frame' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'frame' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('frame');
            handleAddLayer('frame');
          }}
        >
          <Group className={`h-4 w-4 ${activeTool === 'frame' ? "text-white" : "text-gray-400"}`} />
        </Button>

        {/* ✅ Lasso Tool */}
        <Button
          size="icon"
          variant={activeTool === 'lasso' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'lasso' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('lasso')
          }}
        >
          <Lasso className={`h-4 w-4 ${activeTool === 'lasso' ? "text-white" : "text-gray-400"}`} />
        </Button>
      </div>

    </>
  );
};