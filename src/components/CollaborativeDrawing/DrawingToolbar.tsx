
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Square,
  Circle,
  Pencil,
  Highlighter,
  MousePointer,
  Trash2,
  Undo,
  Redo,
  Paintbrush,
  Palette,
} from 'lucide-react';

interface DrawingToolbarProps {
  onToolChange: (tool: 'select' | 'rectangle' | 'circle' | 'freehand' | 'highlight') => void;
  onColorChange: (color: string) => void;
  onResetCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  activeTool: 'select' | 'rectangle' | 'circle' | 'freehand' | 'highlight';
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
  activeTool,
  activeColor,
}) => {
  return (
    <div className="fixed right-10 top-[4.5rem] bg-sidebar border border-field rounded-lg px-2 py-1 flex flex-col gap-1 z-20">
      <div className="flex gap-1">
        <Button
          size="icon"
          variant={activeTool === 'select' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            onToolChange('select');
            toast.info("Select tool activated");
          }}
          title="Select"
        >
          <MousePointer className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant={activeTool === 'rectangle' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            onToolChange('rectangle');
            toast.info("Rectangle tool activated");
          }}
          title="Rectangle"
        >
          <Square className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant={activeTool === 'circle' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            onToolChange('circle');
            toast.info("Circle tool activated");
          }}
          title="Circle"
        >
          <Circle className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant={activeTool === 'freehand' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'freehand' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            onToolChange('freehand');
            toast.info("Freehand drawing activated");
          }}
          title="Freehand drawing"
        >
          <Pencil className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant={activeTool === 'highlight' ? "default" : "ghost"}
          className={`rounded-md ${activeTool === 'highlight' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => {
            onToolChange('highlight');
            toast.info("Highlighter activated");
          }}
          title="Highlighter"
        >
          <Highlighter className="h-4 w-4 text-white" />
        </Button>
      </div>
      
      <div className="flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-md hover:bg-gray-700 relative"
              title="Color picker"
            >
              <Palette className="h-4 w-4 text-white" />
              <div 
                className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: activeColor }}
              />
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
        
        <Button
          size="icon"
          variant="ghost"
          className="rounded-md hover:bg-gray-700"
          onClick={onUndo}
          title="Undo"
        >
          <Undo className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="rounded-md hover:bg-gray-700"
          onClick={onRedo}
          title="Redo"
        >
          <Redo className="h-4 w-4 text-white" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="rounded-md hover:bg-gray-700 text-red-500"
          onClick={onDeleteSelected}
          title="Delete selected"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="border-t border-gray-700 my-1"></div>
      
      <Button
        variant="ghost"
        className="rounded-md hover:bg-gray-700 text-white h-7 text-xs"
        onClick={onResetCanvas}
      >
        Clear Canvas
      </Button>
    </div>
  );
};
