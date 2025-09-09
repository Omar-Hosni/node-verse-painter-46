// Toolbar.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { ZoomControl } from './ZoomControl';
import {
  Hand,
  MousePointer,
  MessageCirclePlus,
  Plus,
} from 'lucide-react';
import { getHighestOrder } from '@/store/nodeActions';

type ToolType = 'select' | 'hand' | 'comment';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  setActiveTab: (tab: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, setActiveTab }) => {
  const addNode = useCanvasStore(state => state.addNode);
  const { getNodes } = useReactFlow();

  const handleOpenInsertTab = () => {
    setActiveTab('Insert');
  };

  const handleToolChange = (tool: ToolType) => {
    onToolChange(tool);
  };

  const handleAddCommentNode = () => {
    const order = getHighestOrder(getNodes()) + 1;
    addNode('comment-node', {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }, order);
  };

  return (
    <>
      {/* Bottom toolbar */}
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-2xl px-2 py-2 flex z-100">
        <Button
          className="hover:bg-gray-600"
          onClick={handleOpenInsertTab}
        >
          <Plus strokeWidth={2} color="gray" />
        </Button>

        <svg viewBox="0 0 24 24" width="35" aria-hidden="true">
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
            color={activeTool === 'select' ? 'white' : 'gray'}
          />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'hand' ? "default" : "ghost"}
          className={`rounded-lg ${activeTool === 'hand' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => handleToolChange('hand')}
        >
          <Hand
            className="h-4 w-4 text-white scale-125"
            color={activeTool === 'hand' ? 'white' : 'gray'}
          />
        </Button>

        <Button
          size="icon"
          variant={activeTool === 'comment' ? "default" : "ghost"}
          className={`rounded-lg ${activeTool === 'comment' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            handleToolChange('comment');
            handleAddCommentNode();
          }}
        >
          <MessageCirclePlus
            className="h-4 w-4 text-white scale-125"
            color={activeTool === 'comment' ? 'white' : 'gray'}
          />
        </Button>

        <svg viewBox="0 0 24 24" width="35" aria-hidden="true">
          <path d="M12 4v16" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
        </svg>

        <ZoomControl />
      </div>
    </>
  );
};
