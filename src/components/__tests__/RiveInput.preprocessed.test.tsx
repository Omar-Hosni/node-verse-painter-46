import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RiveInput } from '../RiveInput';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useWorkflowStore } from '@/store/workflowStore';

// Mock the stores
vi.mock('@/store/useCanvasStore');
vi.mock('@/store/workflowStore');
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/project/test-id' })
}));

// Mock Rive components
vi.mock('@rive-app/react-webgl2', () => ({
  useRive: () => ({
    rive: { viewModelInstance: null, canvas: null },
    RiveComponent: ({ children }: any) => <div data-testid="rive-component">{children}</div>
  }),
  useViewModelInstanceBoolean: () => ({ value: false, setValue: vi.fn() }),
  useViewModelInstanceNumber: () => ({ value: 0, setValue: vi.fn() }),
  useViewModelInstanceColor: () => ({ value: '#ffffff', setValue: vi.fn(), setRgb: vi.fn() })
}));

// Mock services
vi.mock('@/services/runwareService', () => ({
  getRunwareService: () => null
}));

// Mock utils
vi.mock('@/utils/imageUtils', () => ({
  dataUrlToFile: vi.fn(),
  generateImageFilename: vi.fn(() => 'test.png')
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    warning: vi.fn()
  }
}));

describe('RiveInput - Preprocessed Image Display', () => {
  const mockUseCanvasStore = useCanvasStore as any;
  const mockUseWorkflowStore = useWorkflowStore as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default canvas store mock
    mockUseCanvasStore.mockReturnValue({
      selectedNode: null,
      updateNodeData: vi.fn(),
      runwareApiKey: 'test-key',
      setRunwareApiKey: vi.fn(),
      nodes: [],
      edges: []
    });

    // Default workflow store mock
    mockUseWorkflowStore.mockReturnValue({
      hasImageInputConnections: vi.fn(() => false),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      initializeServices: vi.fn(),
      getPreprocessingState: vi.fn(() => null),
      isNodePreprocessing: vi.fn(() => false),
      hasPreprocessingError: vi.fn(() => false),
      hasPreprocessingResult: vi.fn(() => false)
    });
  });

  it('should show Rive component for non-ControlNet nodes', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'regular-node',
        data: {}
      }
    });

    render(<RiveInput nodeType="regular-node" />);
    
    expect(screen.getByTestId('rive-component')).toBeInTheDocument();
  });

  it('should show loading state during preprocessing for ControlNet nodes', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'control-net-pose',
        data: {}
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => true),
      isNodePreprocessing: vi.fn(() => true)
    });

    render(<RiveInput nodeType="control-net-pose" />);
    
    expect(screen.getByText('Preprocessing image...')).toBeInTheDocument();
    expect(screen.getByText('Using pose preprocessor')).toBeInTheDocument();
  });

  it('should show error state when preprocessing fails', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'control-net-depth',
        data: {}
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => true),
      hasPreprocessingError: vi.fn(() => true),
      getPreprocessingState: vi.fn(() => ({
        nodeId: 'test-node',
        status: 'error',
        error: 'Network timeout'
      }))
    });

    render(<RiveInput nodeType="control-net-depth" />);
    
    expect(screen.getByText('Preprocessing failed')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.getByText('Try reconnecting the image')).toBeInTheDocument();
  });

  it('should show preprocessed image when available from node data', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'control-net-edge',
        data: {
          preprocessedImage: {
            guideImageURL: 'https://example.com/preprocessed.jpg',
            preprocessor: 'lineart_coarse',
            timestamp: Date.now()
          }
        }
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => true)
    });

    render(<RiveInput nodeType="control-net-edge" />);
    
    const image = screen.getByAltText('Preprocessed ControlNet guide');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/preprocessed.jpg');
    expect(screen.getByText('lineart_coarse')).toBeInTheDocument();
    expect(screen.getByText('ControlNet Guide')).toBeInTheDocument();
  });

  it('should show preprocessed image when available from preprocessing state', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'control-net-segments',
        data: {}
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => true),
      hasPreprocessingResult: vi.fn(() => true),
      getPreprocessingState: vi.fn(() => ({
        nodeId: 'test-node',
        status: 'completed',
        result: {
          guideImageURL: 'https://example.com/segments.jpg',
          preprocessor: 'seg_ofade20k',
          timestamp: Date.now()
        }
      }))
    });

    render(<RiveInput nodeType="control-net-segments" />);
    
    const image = screen.getByAltText('Preprocessed ControlNet guide');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/segments.jpg');
    expect(screen.getByText('seg_ofade20k')).toBeInTheDocument();
  });

  it('should show Rive component for light ControlNet nodes (no preprocessing)', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'seed-image-lights',
        data: {}
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => true)
    });

    render(<RiveInput nodeType="seed-image-lights" />);
    
    // Should show Rive component since light nodes don't require preprocessing
    expect(screen.getByTestId('rive-component')).toBeInTheDocument();
  });

  it('should show Rive component when no image connections exist', () => {
    mockUseCanvasStore.mockReturnValue({
      ...mockUseCanvasStore(),
      selectedNode: {
        id: 'test-node',
        type: 'control-net-pose',
        data: {}
      }
    });

    mockUseWorkflowStore.mockReturnValue({
      ...mockUseWorkflowStore(),
      hasImageInputConnections: vi.fn(() => false)
    });

    render(<RiveInput nodeType="control-net-pose" />);
    
    // Should show Rive component when no image connections
    expect(screen.getByTestId('rive-component')).toBeInTheDocument();
  });
});