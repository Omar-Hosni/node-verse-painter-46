import React from 'react';
import { Button } from "@/components/ui/button";
import { Play, FrameIcon, Type, Square, Circle, Star, File, ChevronDown, UserPlus } from 'lucide-react';
import { IoMdArrowDropdown } from "react-icons/io";
import { CollaboratorsDisplay } from './CollaboratorsDisplay';
import SvgIcon from './SvgIcon';

import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeData } from '@/store/types';
import { toast } from 'sonner';
import { getHighestOrder } from '@/store/nodeActions';

interface EditorHeaderProps {
  projectName?: string;
  onSave?: () => void;
  onBackToDashboard?: () => void;
  projectId?: string;
}

// Primary button component - same as RightSidebar
// Primary button component - same as RightSidebar, but supports an inline dropdown chevron
const PrimaryButton = React.memo(({
  onClick,
  children,
  icon: Icon,
  disabled = false,
  className = "",
  showCaret = false,
  isOpen = false,
  onArrowClick,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
  showCaret?: boolean;
  isOpen?: boolean;
  onArrowClick?: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-3 pl-3 ${showCaret ? "pr-2" : "pr-4"} h-[30px] rounded-full flex gap-0.5 items-center justify-center transition-colors ${className}`}
    style={{ backgroundColor: disabled ? undefined : '#007AFF', minHeight: '30px' }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = '#0056CC'; }}
    onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = '#007AFF'; }}
  >
    {Icon && <Icon className="h-4 w-4"/>}
    <span className="whitespace-nowrap">{children}</span>

    {showCaret && (
      <>
        <span
          role="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title="Choose workflow"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onArrowClick?.(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onArrowClick?.(); }
          }}
          className={`inline-flex items-center justify-center h-5 w-5 rounded-sm hover:bg-white/10 focus:outline-none`}
        >
          <IoMdArrowDropdown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </>
    )}
  </button>
));


// Secondary button component - same as Primary but with text input color
const SecondaryButton = React.memo(({
  onClick,
  children,
  icon: Icon,
  disabled = false,
  className = ""
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 justify-center transition-colors ${className}`}
    style={{
      backgroundColor: disabled ? undefined : '#1a1a1a',
      minHeight: '30px',
      height: '30px'
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = '#333333';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = '#1a1a1a';
      }
    }}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
));

export const EditorHeader = ({ 
  projectName,
  onSave,
  onBackToDashboard,
  projectId
}: EditorHeaderProps) => {
  const reactFlowInstance = useReactFlow();
  const { 
    addNode, 
    nodes, 
    edges,
    credits, 
    fetchUserCredits, 
    useCreditsForGeneration, 
    sendWorkflowToAPI,
    exportWorkflowAsJson,
    activeTool,
    setActiveTool,
    runwareApiKey,
    selectedNode
  } = useCanvasStore();

  // Initialize WorkflowStore with nodes and edges from CanvasStore
  const { 
    executeWorkflow, 
    isGenerating, 
    setNodes, 
    setEdges, 
    initializeServices,
    hydrateProcessedImagesFromNodes,
  } = useWorkflowStore();


  const [selectedTargetId, setSelectedTargetId] = React.useState<string | null>(null);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showInviteVideo, setShowInviteVideo] = React.useState(false);
  const inviteRef = React.useRef<HTMLDivElement>(null);

  // Sync nodes and edges with WorkflowStore
  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  // Initialize services with API key
  React.useEffect(() => {
    if (runwareApiKey) initializeServices(runwareApiKey);
  }, [runwareApiKey, initializeServices]);

  // Multi-workflow selection logic
  const runnableTargets = React.useMemo(
    () => nodes.filter(n => ['output', 'previewNode', 'preview-realtime-node'].includes(n.type ?? '')),
    [nodes]
  );

  // Find the target node for the workflow containing the selected node
  const findWorkflowTarget = React.useCallback((selectedNodeId: string) => {
    if (!selectedNodeId) return null;

    const visited = new Set<string>();
    const segmentNodes = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Helper to check if a node is a preview-like boundary
    const isPreviewBoundary = (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return false;
      const type = node.type ?? node.data?.type;
      return type === 'previewNode' || type === 'output' || type === 'preview-realtime-node';
    };
    
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      segmentNodes.add(id);
      
      edges.forEach(e => {
        let nextId: string | null = null;
        
        if (e.source === id) {
          nextId = e.target;
        } else if (e.target === id) {
          nextId = e.source;
        }
        
        if (nextId && !visited.has(nextId)) {
          // If we're about to traverse into a preview boundary that already has an image,
          // include it but don't traverse beyond it
          if (isPreviewBoundary(nextId)) {
            const node = nodeMap.get(nextId);
            const nodeData = node?.data as NodeData;
            const hasPersistedImage = nodeData?.imageUrl || 
                                    nodeData?.generatedImage || 
                                    nodeData?.right_sidebar?.imageUrl;
            
            visited.add(nextId);
            segmentNodes.add(nextId);
            
            // Don't traverse beyond persisted preview boundaries
            if (!hasPersistedImage) {
              traverse(nextId);
            }
          } else {
            traverse(nextId);
          }
        }
      });
    };
    
    traverse(selectedNodeId);
    
    const workflowTargets = runnableTargets.filter(t => segmentNodes.has(t.id));
    return workflowTargets.sort((a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0))[0] || null;
  }, [edges, runnableTargets, nodes]);

  React.useEffect(() => {
    if (!runnableTargets.length) return;

    // 1) if the user has a preview/output selected, prefer it
    if (selectedNode && (selectedNode.type === 'output' || selectedNode.type === 'previewNode')) {
      setSelectedTargetId(selectedNode.id);
      return;
    }

    // 2) if a node is selected, find the target in its workflow
    if (selectedNode) {
      const workflowTarget = findWorkflowTarget(selectedNode.id);
      if (workflowTarget) {
        setSelectedTargetId(workflowTarget.id);
        return;
      }
    }

    // 3) otherwise pick the right-most preview/output as a smart default
    if (!selectedTargetId || !runnableTargets.some(t => t.id === selectedTargetId)) {
      const rightMost = [...runnableTargets].sort(
        (a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0)
      )[0];
      if (rightMost) {
        setSelectedTargetId(rightMost.id);
      }
    }
  }, [runnableTargets, selectedNode, selectedTargetId, findWorkflowTarget]);



  // Default to the first runnable target whenever the list changes
  React.useEffect(() => {
    if (!selectedTargetId && runnableTargets.length > 0) {
      setSelectedTargetId(runnableTargets[0].id);
    } else if (selectedTargetId && !runnableTargets.find(n => n.id === selectedTargetId)) {
      setSelectedTargetId(runnableTargets[0]?.id ?? null);
    }
  }, [runnableTargets, selectedTargetId]);

  // Add Ctrl+S keyboard shortcut for Save
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

  const handleCreateFrame = () => {
    // Toggle the frame drawing tool
    if (activeTool === 'frame') {
      setActiveTool('select');
    } else {
      setActiveTool('frame');
    }
  };

  const handleCreateTextTool = () => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const position = reactFlowInstance.screenToFlowPosition(center);
    const order = getHighestOrder(nodes) + 1;
    
    addNode('text-tool', position, order);
  };

  const handleCreateRectangleTool = () => {
    // Toggle the rectangle drawing tool
    if (activeTool === 'rectangle') {
      setActiveTool('select');
    } else {
      setActiveTool('rectangle');
    }
  };

  const handleCreateCircleTool = () => {
    // Toggle the circle drawing tool
    if (activeTool === 'circle') {
      setActiveTool('select');
    } else {
      setActiveTool('circle');
    }
  };

  const handleCreateStarTool = () => {
    // Toggle the star drawing tool
    if (activeTool === 'star') {
      setActiveTool('select');
    } else {
      setActiveTool('star');
    }
  };

  const handleCreateRemoveBGTool = () => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const position = reactFlowInstance.screenToFlowPosition(center);
    const order = getHighestOrder(nodes) + 1;
    
    addNode('image-to-image-remove-bg', position, order);
  };

  const handleCreateUpscaleTool = () => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const position = reactFlowInstance.screenToFlowPosition(center);
    const order = getHighestOrder(nodes) + 1;
    
    addNode('image-to-image-upscale', position, order);
  };

  const handleGenerateImage = async () => {
    const targetId = selectedTargetId || runnableTargets[0]?.id;
    if (!targetId) {
      toast.error("No output/preview node found! Please add one to your canvas.");
      return;
    }

    if (credits === null || credits === undefined) {
      await fetchUserCredits();
      if (credits === null || credits === undefined) {
        toast.error("Could not fetch your credits. Please try again.");
        return;
      }
    }
    if (credits < 1) {
      toast.error("Not enough credits! Please purchase more credits to continue generating images.");
      return;
    }

    try {
      toast.info("Starting workflow execution...");
      // hydrate any cached guides before run if you use that pattern
      useWorkflowStore.getState().hydrateProcessedImagesFromNodes?.();
      await executeWorkflow(targetId);
      await useCreditsForGeneration();
    } catch (error) {
      console.error("Error executing workflow:", error);
      toast.error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportWorkflow = () => {
    const json = exportWorkflowAsJson();
    console.log("Workflow JSON:", json);

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Workflow exported as JSON');
  };
  
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Handle click outside for invite video
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!inviteRef.current) return;
      if (!inviteRef.current.contains(e.target as Node)) setShowInviteVideo(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  console.log("runnableTargets", runnableTargets)
  return (
    <header className="flex items-center justify-between h-[55px] min-h-[55px] max-h-[55px] bg-[#0d0d0d] border-b border-[#1d1d1d] z-20">
      {/* Left section - 265px width */}
      <div className="w-[265px] flex items-center" style={{ paddingLeft: '16px' }}>
        <div className="flex items-center">
          {/* Clickable logo */}
          <img 
            src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png" 
            alt="App Logo" 
            className="h-4 w-auto cursor-pointer" 
            onClick={onBackToDashboard}
          />
          {projectName && (
            <div className="flex items-center" style={{ marginLeft: '28px' }}>
              <File className="h-4 w-4 text-[#9e9e9e]" style={{ marginRight: '6px' }} />
              <span className="text-sm text-[#9e9e9e]">Files / </span>
              <span className="text-sm font-medium text-white truncate capitalize" style={{ marginLeft: '6px' }}>
                {projectName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center section - fill width with centered content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          {/* Frame tool button */}
          <button
            className={`w-[34px] h-[34px] p-0 rounded-lg transition-colors flex items-center justify-center ${
              activeTool === 'frame' 
                ? 'text-white bg-[#007AFF]' 
                : 'text-[#9e9e9e] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            onClick={handleCreateFrame}
            title="Create Frame"
          >
            <FrameIcon className="h-5 w-5" style={{ strokeWidth: 1 }} />
          </button>

          {/* Rectangle tool button */}
          <button
            className={`w-[34px] h-[34px] p-0 rounded-lg transition-colors flex items-center justify-center ${
              activeTool === 'rectangle' 
                ? 'text-white bg-[#007AFF]' 
                : 'text-[#9e9e9e] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            onClick={handleCreateRectangleTool}
            title="Create Rectangle"
          >
            <Square className="h-5 w-5" style={{ strokeWidth: 1 }} />
          </button>

          {/* Circle tool button */}
          <button
            className={`w-[34px] h-[34px] p-0 rounded-lg transition-colors flex items-center justify-center ${
              activeTool === 'circle' 
                ? 'text-white bg-[#007AFF]' 
                : 'text-[#9e9e9e] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            onClick={handleCreateCircleTool}
            title="Create Circle"
          >
            <Circle className="h-5 w-5" style={{ strokeWidth: 1 }} />
          </button>

          {/* Star tool button */}
          <button
            className={`w-[34px] h-[34px] p-0 rounded-lg transition-colors flex items-center justify-center ${
              activeTool === 'star' 
                ? 'text-white bg-[#007AFF]' 
                : 'text-[#9e9e9e] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            onClick={handleCreateStarTool}
            title="Create Star"
          >
            <Star className="h-5 w-5" style={{ strokeWidth: 1 }} />
          </button>
          
          {/* Text tool button */}
          <button
            className="w-[34px] h-[34px] p-0 text-[#9e9e9e] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors flex items-center justify-center"
            onClick={handleCreateTextTool}
            title="Create Text"
          >
            <Type className="h-5 w-5" style={{ strokeWidth: 1 }} />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-[#333333] mx-1"></div>

          {/* Remove BG tool button */}
          <button
            className="w-[34px] h-[34px] p-0 hover:bg-[#1a1a1a] rounded-lg transition-colors flex items-center justify-center group"
            onClick={handleCreateRemoveBGTool}
            title="Remove Background"
          >
            <SvgIcon name="removebg" className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Upscale tool button */}
          <button
            className="w-[34px] h-[34px] p-0 hover:bg-[#1a1a1a] rounded-lg transition-colors flex items-center justify-center group"
            onClick={handleCreateUpscaleTool}
            title="Upscale Image"
          >
            <SvgIcon name="upscale" className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* Right section - 265px width */}
      <div className="w-[265px] flex gap-3 items-center justify-end px-4">
        <SecondaryButton
          onClick={() => {}} // No action for now
          className="whitespace-nowrap pointer-events-none"
        >
          {credits !== null ? credits.toLocaleString() : '...'} credits
        </SecondaryButton>
        <CollaboratorsDisplay />
        

        
        <SecondaryButton
          onClick={handleExportWorkflow}
          className="whitespace-nowrap"
        >
          Export
        </SecondaryButton>
        
        {/* Invite button with video dropdown */}
        <div className="relative" ref={inviteRef}>
          <SecondaryButton
            onClick={() => setShowInviteVideo(!showInviteVideo)}
            className="whitespace-nowrap"
            icon={UserPlus}
          >
            Invite
          </SecondaryButton>
          
          {showInviteVideo && (
            <div className="absolute right-0 mt-2 rounded-md bg-[#0f0f0f] border border-[#2a2a2a] shadow-lg z-50 overflow-hidden animate-scale-in">
              <video
                src="/invite_video.mp4"
                autoPlay
                loop
                muted
                className="w-80 max-w-none"
                style={{ display: 'block' }}
              />
            </div>
          )}
        </div>
        
<div className="relative" ref={menuRef}>
  <PrimaryButton
    onClick={handleGenerateImage}
    disabled={!selectedTargetId || isGenerating}
    className="whitespace-nowrap"
    icon={() => (
      isGenerating ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2.5L12.5 8L4 13.5V2.5Z" fill="currentColor" />
        </svg>
      )
    )}
    showCaret={runnableTargets.length > 1}
    isOpen={showMenu}
    onArrowClick={() => setShowMenu(v => !v)}
  >
    {isGenerating ? 'Generating...' : 'Render'}
  </PrimaryButton>

  {showMenu && runnableTargets.length > 1 && (
    <div
      className="absolute right-0 mt-2 w-56 rounded-md bg-[#0f0f0f] border border-[#2a2a2a] shadow-lg z-50"
      role="menu"
      onMouseLeave={() => setShowMenu(false)}
    >
      {runnableTargets.map((n) => (
        <button
          key={n.id}
          onClick={() => { setSelectedTargetId(n.id); setShowMenu(false); }}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1a1a1a] ${
            selectedTargetId === n.id ? 'text-white' : 'text-[#9e9e9e]'
          }`}
          role="menuitem"
        >
          {(n.data as any)?.label || (n.data as any)?.name || `${n.type} • ${n.id}`}
        </button>
      ))}
    </div>
  )}
</div>

      </div>

    </header>
  );
};