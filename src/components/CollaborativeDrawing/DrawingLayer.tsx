
import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CollaborativeCanvas } from './FabricCanvas';
import { DrawingToolbar } from './DrawingToolbar';

export const DrawingLayer: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'circle' | 'freehand' | 'highlight'>('select');
  const [activeColor, setActiveColor] = useState<string>('#ff0000');
  const { projectId } = useParams<{ projectId: string }>();

  const handleToolChange = useCallback((tool: typeof activeTool) => {
    setActiveTool(tool);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setActiveColor(color);
  }, []);

  const handleResetCanvas = useCallback(() => {
    if ((window as any).fabricActions?.resetCanvas) {
      (window as any).fabricActions.resetCanvas();
    }
  }, []);

  const handleUndo = useCallback(() => {
    if ((window as any).fabricActions?.undoCanvas) {
      (window as any).fabricActions.undoCanvas();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if ((window as any).fabricActions?.redoCanvas) {
      (window as any).fabricActions.redoCanvas();
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if ((window as any).fabricActions?.deleteSelected) {
      (window as any).fabricActions.deleteSelected();
    }
  }, []);

  if (!projectId) return null;

  return (
    <>
      <DrawingToolbar 
        activeTool={activeTool}
        activeColor={activeColor}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onResetCanvas={handleResetCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDeleteSelected={handleDeleteSelected}
      />
      <CollaborativeCanvas 
        activeTool={activeTool}
        activeColor={activeColor}
        projectId={projectId}
      />
    </>
  );
};
