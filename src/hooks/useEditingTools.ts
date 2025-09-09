import { useState, useCallback } from 'react';

export interface EditingToolState {
  maskEditor: {
    isOpen: boolean;
    imageUrl: string | null;
    nodeId: string | null;
  };
  outpaintControls: {
    isOpen: boolean;
    nodeId: string | null;
    direction: 'up' | 'down' | 'left' | 'right' | 'all';
    amount: number;
  };
}

export const useEditingTools = () => {
  const [state, setState] = useState<EditingToolState>({
    maskEditor: {
      isOpen: false,
      imageUrl: null,
      nodeId: null
    },
    outpaintControls: {
      isOpen: false,
      nodeId: null,
      direction: 'all',
      amount: 50
    }
  });

  // Mask Editor functions
  const openMaskEditor = useCallback((nodeId: string, imageUrl: string) => {
    setState(prev => ({
      ...prev,
      maskEditor: {
        isOpen: true,
        imageUrl,
        nodeId
      }
    }));
  }, []);

  const closeMaskEditor = useCallback(() => {
    setState(prev => ({
      ...prev,
      maskEditor: {
        isOpen: false,
        imageUrl: null,
        nodeId: null
      }
    }));
  }, []);

  const handleMaskComplete = useCallback((maskDataUrl: string) => {
    // This will be called when the user completes mask editing
    // The mask data URL can be used by the workflow system
    console.log('Mask completed for node:', state.maskEditor.nodeId, 'Mask:', maskDataUrl);
    closeMaskEditor();
    return maskDataUrl;
  }, [state.maskEditor.nodeId, closeMaskEditor]);

  // Outpaint Controls functions
  const openOutpaintControls = useCallback((nodeId: string, initialDirection: 'up' | 'down' | 'left' | 'right' | 'all' = 'all', initialAmount: number = 50) => {
    setState(prev => ({
      ...prev,
      outpaintControls: {
        isOpen: true,
        nodeId,
        direction: initialDirection,
        amount: initialAmount
      }
    }));
  }, []);

  const closeOutpaintControls = useCallback(() => {
    setState(prev => ({
      ...prev,
      outpaintControls: {
        isOpen: false,
        nodeId: null,
        direction: 'all',
        amount: 50
      }
    }));
  }, []);

  const handleOutpaintSettings = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'all', amount: number) => {
    // This will be called when the user applies outpaint settings
    console.log('Outpaint settings for node:', state.outpaintControls.nodeId, 'Direction:', direction, 'Amount:', amount);
    closeOutpaintControls();
    return { direction, amount };
  }, [state.outpaintControls.nodeId, closeOutpaintControls]);

  return {
    state,
    maskEditor: {
      open: openMaskEditor,
      close: closeMaskEditor,
      onComplete: handleMaskComplete
    },
    outpaintControls: {
      open: openOutpaintControls,
      close: closeOutpaintControls,
      onSettings: handleOutpaintSettings
    }
  };
};