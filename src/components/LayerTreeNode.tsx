import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { TreeNode } from '@/utils/layerTreeUtils';
import { FrameIcon } from 'lucide-react';
import { getDisplayNameFromType } from '@/store/nodeActions';
// Removed ChevronDown, ChevronRight - using custom triangular arrows instead
import SvgIcon from './SvgIcon';

// Component to show the real parent name
const RealParentTag: React.FC<{ realParentId: string }> = ({ realParentId }) => {
  const { nodes } = useCanvasStore();
  const realParent = nodes.find(n => n.id === realParentId);
  const parentName = realParent?.data?.displayName || realParent?.data?.label || realParent?.type || 'Unknown';

  return (
    <span className="text-xs text-orange-400 opacity-60 mr-2">
      {parentName}
    </span>
  );
};

interface LayerTreeNodeProps {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onReorder: (draggedNodeId: string, targetNodeId: string, position: 'before' | 'after' | 'inside') => void;
}

export const LayerTreeNode: React.FC<LayerTreeNodeProps> = ({
  node,
  level,
  isExpanded,
  onToggleExpanded,
  onReorder
}) => {
  const { selectedNode, setSelectedNode, setSelectedNodeById } = useCanvasStore();
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNode?.id === node.id;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // Function to count all visible descendants recursively
  const countAllVisibleDescendants = (node: TreeNode): number => {
    if (!node.children || node.children.length === 0) {
      return 0;
    }

    let count = node.children.length; // Count direct children

    // Recursively count grandchildren, great-grandchildren, etc.
    for (const child of node.children) {
      count += countAllVisibleDescendants(child);
    }

    return count;
  };

  const getNodeIcon = (nodeType: string | undefined) => {
    if (!nodeType) return 'placeholder';

    // Frame nodes - use frame icon like in app header
    if (nodeType === 'frame-node') return 'frame';

    if (nodeType.includes('pose')) return 'pose';
    if (nodeType.includes('3dmaker')) return '3dmaker';
    if (nodeType.includes('depth')) return 'depth';
    if (nodeType.includes('edge')) return 'edge';
    if (nodeType.includes('engine')) return 'engine';
    if (nodeType.includes('face')) return 'face';
    if (nodeType.includes('gear')) return 'gear';
    if (nodeType.includes('image_output')) return 'image_output';
    if (nodeType.includes('inpainting')) return 'inpainting';
    if (nodeType.includes('lights')) return 'lights';
    if (nodeType.includes('merger')) return 'merger';
    if (nodeType.includes('normal_map')) return 'normal_map';
    if (nodeType.includes('objectrelight')) return 'objectrelight';
    if (nodeType.includes('outpainting')) return 'outpainting';
    if (nodeType.includes('realtime')) return 'realtime';
    if (nodeType.includes('reangle')) return 'reangle';
    if (nodeType.includes('reference')) return 'reference';
    if (nodeType.includes('reimagine')) return 'reimagine';
    if (nodeType.includes('remove')) return 'removebg';
    if (nodeType.includes('rescene')) return 'rescene';
    if (nodeType.includes('router')) return 'router';
    if (nodeType.includes('segments')) return 'segments';
    if (nodeType.includes('text')) return 'text';
    if (nodeType.includes('upscale')) return 'upscale';
    if (nodeType.includes('layer-image')) return 'image_input';

    // Shape nodes
    if (nodeType === 'rectangle-node') return 'rectangle';
    if (nodeType === 'circle-node') return 'circle';
    if (nodeType === 'star-node') return 'star';

    return 'placeholder';
  };

  const handleNodeClick = () => {
    setSelectedNode(node.reactFlowNode);
    setSelectedNodeById(node.reactFlowNode);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const isFrameNode = node.reactFlowNode.type === 'frame-node';

    if (y < height * 0.25) {
      setDragOver('before');
    } else if (y > height * 0.75) {
      setDragOver('after');
    } else {
      // Allow 'inside' for frame nodes or nodes that already have children
      setDragOver((hasChildren || isFrameNode) ? 'inside' : 'after');
    }
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedNodeId = e.dataTransfer.getData('text/plain');

    if (draggedNodeId !== node.id && dragOver) {
      onReorder(draggedNodeId, node.id, dragOver);
    }

    setDragOver(null);
  };

  const iconName = getNodeIcon(node.reactFlowNode.id);

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          flex items-center cursor-pointer relative
          ${isSelected
            ? 'text-white'
            : 'text-[#9e9e9e] hover:text-white'
          }
          ${isDragging ? 'opacity-50' : ''}
          ${dragOver === 'before' ? 'border-t-2 border-[#007AFF]' : ''}
          ${dragOver === 'after' ? 'border-b-2 border-[#007AFF]' : ''}
          ${dragOver === 'inside' ? 'bg-[#007AFF] bg-opacity-20 border-2 border-[#007AFF] ' : ''}
        `}
        style={{
          paddingLeft: `${level * 20}px`,
          paddingRight: '8px',
          backgroundColor: isSelected ? '#007AFF' : (isHovered ? 'rgba(255, 255, 255, 0.06)' : undefined),
          height: '30px',
          paddingTop: '0px',
          paddingBottom: '0px',
          borderRadius: hasChildren && isSelected  && isExpanded ? '10px 10px 0px 0px' : '10px'
        }}
        onClick={handleNodeClick}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
            className="py-0.5 rounded"
            style={{ paddingLeft: '4px', paddingRight: '2px' }}
          >
            {isExpanded ? (
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                <polygon points="1,1 7,1 4,4" fill="currentColor" />
              </svg>
            ) : (
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ transform: 'rotate(-90deg)' }}>
                <polygon points="1,1 7,1 4,4" fill="currentColor" />
              </svg>
            )}
          </button>
        ) : (
          <div style={{ width: '14px', paddingLeft: '4px', paddingRight: '2px' }} />
        )}

        <div
          className="p-1 rounded"
          style={{
            marginRight: '12px',
            borderRadius: '5px',
            backgroundColor: hasChildren && !isSelected ? '#007AFF' :
              hasChildren && isSelected ? 'white' :
                'transparent'
          }}
        >
          <SvgIcon
            name={iconName}
            className={`h-3 w-3 ${hasChildren && !isSelected ? 'text-white' :
              hasChildren && isSelected ? 'text-[#007AFF]' :
                isSelected ? 'text-white' : 'text-[#9e9e9e]'
              }`}
            style={{ strokeWidth: '2px' }}
          />
        </div>

        <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-[#9e9e9e]'}`}>
          {node.reactFlowNode.data?.displayName || node.reactFlowNode.data?.label || getDisplayNameFromType(node.reactFlowNode.type)}
        </span>

        {/* Show frame indicator - HIDDEN */}
        {node.reactFlowNode.type === 'frame-node' && (
          <span className="hidden text-xs text-blue-400 opacity-60 mr-2">Frame</span>
        )}

        {/* Eye, Lock, and Frame icons - show on hover or when active */}
        <div className="ml-auto flex items-center gap-1">
          {/* Frame icon - show when node has real parent frame */}
          {node.isVisualChild && node.realParentId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const realParent = useCanvasStore.getState().nodes.find(n => n.id === node.realParentId);
                if (realParent) {
                  setSelectedNode(realParent);
                  setSelectedNodeById(realParent);
                }
              }}
              className={`p-1 transition-colors ${(isHovered || true) ? 'opacity-100' : 'opacity-0'
                }`}
              style={{
                borderRadius: '6px',
                color: isSelected ? 'white' : 'currentColor'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Select parent frame"
            >
              <FrameIcon width="12" height="12" strokeWidth="2" />
            </button>
          )}
          {/* Eye icon - visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(!isVisible);
            }}
            className={`p-1 transition-colors ${(isHovered || isSelected || !isVisible) ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              borderRadius: '6px',
              color: isSelected ? 'white' : (!isVisible ? '#007AFF' : 'currentColor')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isVisible ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Lock icon - lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(!isLocked);
            }}
            className={`p-1 transition-colors ${(isHovered || isSelected || isLocked) ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              borderRadius: '6px',
              color: isSelected ? 'white' : (isLocked ? '#007AFF' : 'currentColor')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isLocked ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0 1 5-5c.88 0 1.73.217 2.47.6" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>

        <span className="hidden ml-auto text-xs opacity-60">
          z:{node.reactFlowNode.zIndex || 0}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="relative" style={{ position: 'relative' }}>
          {/* Visual grouping background for selected parent */}
          {isSelected && (
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: '0px',
                right: '0px',
                width: '100%',
                height: `${countAllVisibleDescendants(node) * 30}px`, // 30px per visible descendant
                backgroundColor: 'rgba(0, 122, 255, 0.13)', // #007AFF with 13% opacity
                zIndex: 0,
                borderRadius: '0px 0px 10px 10px' // Bottom corners only, 10px to match layers
              }}
            />
          )}
          {node.children.map(child => (
            <LayerTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={true} // Children are always expanded for now
              onToggleExpanded={onToggleExpanded}
              onReorder={onReorder}
            />
          ))}
        </div>
      )}
    </div>
  );
};