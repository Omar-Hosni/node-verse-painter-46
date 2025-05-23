
import { useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { toast } from 'sonner';

export const useCanvasKeyboardShortcuts = () => {
  const { 
    setActiveTool,
    copySelectedNode,
    pasteNodes,
    cutSelectedNode,
    deleteSelectedNode,
    undo,
    redo,
  } = useCanvasStore();
  
  const reactFlowInstance = useReactFlow();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if an input or textarea element is focused
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA'
    )) {
      return; // Skip shortcuts when an input field is focused
    }

    const { key, ctrlKey, metaKey, shiftKey } = event;
    const cmdOrCtrl = metaKey || ctrlKey;

    // Tool shortcuts
    if (!cmdOrCtrl && !shiftKey) {
      switch (key.toLowerCase()) {
        case 'v': // Select tool
          event.preventDefault();
          setActiveTool('select');
          toast.info('Select tool activated');
          break;
        case 'h': // Hand tool
          event.preventDefault();
          setActiveTool('hand');
          toast.info('Hand tool activated');
          break;
        case 'r': // Rectangle tool
          event.preventDefault();
          setActiveTool('rectangle');
          toast.info('Rectangle tool activated');
          break;
        case 'o': // Circle tool (o for "oval")
          event.preventDefault();
          setActiveTool('circle');
          toast.info('Circle tool activated');
          break;
        case 't': // Text tool
          event.preventDefault();
          setActiveTool('text');
          toast.info('Text tool activated');
          break;
        case 'f': // Frame tool
          event.preventDefault();
          setActiveTool('frame');
          toast.info('Frame tool activated');
          break;
        case 'd': // Draw tool
          event.preventDefault();
          setActiveTool('draw');
          toast.info('Draw tool activated');
          break;
        case '+': // Zoom in
          event.preventDefault();
          reactFlowInstance.zoomIn();
          break;
        case '-': // Zoom out
          event.preventDefault();
          reactFlowInstance.zoomOut();
          break;
      }
    }

    // Standard shortcuts (copy, paste, etc.)
    if (cmdOrCtrl) {
      switch (key.toLowerCase()) {
        case 'c': // Copy
          event.preventDefault();
          copySelectedNode();
          toast.info('Node copied to clipboard');
          break;
        case 'x': // Cut
          event.preventDefault();
          cutSelectedNode();
          toast.info('Node cut to clipboard');
          break;
        case 'v': // Paste
          event.preventDefault();
          // Get current pane center position for paste
          if (reactFlowInstance) {
            const { x, y } = reactFlowInstance.getViewport();
            pasteNodes({ x: -x + 200, y: -y + 200 });
            toast.info('Node pasted from clipboard');
          }
          break;
        case 'z': // Undo
          event.preventDefault();
          if (event.shiftKey) {
            redo(); // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
            toast.info('Redo action');
          } else {
            undo(); // Ctrl+Z or Cmd+Z for Undo
            toast.info('Undo action');
          }
          break;
        case 'y': // Redo (alternative)
          event.preventDefault();
          redo();
          toast.info('Redo action');
          break;
      }
    } else if (key === 'Delete' || key === 'Backspace') {
      // Only handle Delete/Backspace when not in an input field
      deleteSelectedNode();
      toast.info('Node deleted');
    }
  }, [
    copySelectedNode, 
    pasteNodes, 
    cutSelectedNode, 
    deleteSelectedNode, 
    undo, 
    redo, 
    reactFlowInstance, 
    setActiveTool
  ]);

  // Register and unregister keyboard event handlers
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
