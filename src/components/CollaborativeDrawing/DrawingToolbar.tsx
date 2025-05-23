import React from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Square,
  Circle,
  Pencil,
  Highlighter,
  MousePointer,
  Hand,
  Trash2,
  Undo,
  Redo,
  Palette,
} from 'lucide-react';

interface DrawingToolbarProps {
  onToolChange: (tool: 'select' | 'hand' | 'rectangle' | 'circle' | 'freehand' | 'highlight') => void;
  onColorChange: (color: string) => void;
  onResetCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onPlaceShape: (shape: 'rectangle' | 'circle') => void;
  activeTool: 'select' | 'hand' | 'rectangle' | 'circle' | 'freehand' | 'highlight';
  activeColor: string;
}

const colorOptions = [
  { name: "Red", value: "#ff0000" },
  { name: "Green", value: "#00ff00" },
  { name: "Blue", value: "#0000ff" },
  { name: "Yellow", value: "#ffff00" },
  { name: "Purple", value: "#800080" },
  { name: "Orange", value: "#ffa500" },
  { name: "Pink", value: "#ffc0cb" },
  { name: "Black", value: "#000000" },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onToolChange,
  onColorChange,
  onResetCanvas,
  onUndo,
  onRedo,
  onDeleteSelected,
  onPlaceShape,
  activeTool,
  activeColor,
}) => {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[4.5rem] bg-sidebar border border-field rounded-lg px-2 py-1 flex flex-col gap-2 z-20">
      <div className="flex gap-1">
        <Button size="icon" onClick={() => onToolChange('select')} title="Pointer" className={activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <MousePointer className="h-4 w-4 text-white" />
        </Button>
        <Button size="icon" onClick={() => onToolChange('hand')} title="Pan/Hand" className={activeTool === 'hand' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <Hand className="h-4 w-4 text-white" />
        </Button>
        <Button size="icon" onClick={() => { onToolChange('rectangle'); onPlaceShape('rectangle'); }} title="Add Rectangle" className={activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <Square className="h-4 w-4 text-white" />
        </Button>
        <Button size="icon" onClick={() => { onToolChange('circle'); onPlaceShape('circle'); }} title="Add Circle" className={activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <Circle className="h-4 w-4 text-white" />
        </Button>
        <Button size="icon" onClick={() => onToolChange('freehand')} title="Freehand" className={activeTool === 'freehand' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <Pencil className="h-4 w-4 text-white" />
        </Button>
        <Button size="icon" onClick={() => onToolChange('highlight')} title="Highlighter" className={activeTool === 'highlight' ? 'bg-blue-600' : 'hover:bg-gray-700'}>
          <Highlighter className="h-4 w-4 text-white" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-md hover:bg-gray-700 relative" title="Color picker">
              <Palette className="h-4 w-4 text-white" />
              <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-sidebar border-field">
            <div className="grid grid-cols-4 gap-1">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  className="w-12 h-12 rounded-md border border-gray-600 flex items-center justify-center hover:opacity-80"
                  style={{ backgroundColor: color.value }}
                  onClick={() => {
                    onColorChange(color.value);
                    toast.info(`Color changed to ${color.name}`);
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="icon" variant="ghost" onClick={onUndo}><Undo className="h-4 w-4 text-white" /></Button>
        <Button size="icon" variant="ghost" onClick={onRedo}><Redo className="h-4 w-4 text-white" /></Button>
        <Button size="icon" variant="ghost" onClick={onDeleteSelected}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
      <Button variant="ghost" className="text-white text-xs hover:bg-gray-700" onClick={onResetCanvas}>Clear Canvas</Button>
    </div>
  );
};
