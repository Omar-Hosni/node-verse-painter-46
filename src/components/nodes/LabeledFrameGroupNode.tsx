import React, { forwardRef, HTMLAttributes, ReactNode } from "react";
import { NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type LabeledFrameGroupNodeLabelProps = HTMLAttributes<HTMLDivElement>;

export const LabeledFrameGroupNodeLabel = forwardRef<HTMLDivElement, LabeledFrameGroupNodeLabelProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        <div className={cn("px-3 py-1 text-xs rounded-t-md text-white shadow", className)}>
          {children}
        </div>
      </div>
    );
  }
);
LabeledFrameGroupNodeLabel.displayName = "LabeledFrameGroupNodeLabel";

export type LabeledFrameGroupNodeProps = Partial<NodeProps> & {
  label?: ReactNode;
};

export const LabeledFrameGroupNode = forwardRef<HTMLDivElement, LabeledFrameGroupNodeProps>(
  ({ selected, label, data, id, ...props }, ref) => {
    const { getNode } = useReactFlow();
    const node = getNode(id || '');
    
    // Get current dimensions from the node style
    const width = Math.round(Number(node?.style?.width) || Number(node?.width) || 250);
    const height = Math.round(Number(node?.style?.height) || Number(node?.height) || 180);
    
    // Check if this frame is being hovered over during a drag operation
    const isHoveredForDrop = data?.isHoveredForDrop;

    return (
      <div 
        ref={ref}
        {...props}
        className={`react-flow__node-frame ${selected ? 'selected' : ''} ${isHoveredForDrop ? 'hovered-for-drop' : ''}`}
        style={{
          border: isHoveredForDrop 
            ? '2px solid #007AFF' 
            : selected 
              ? '1px solid #007AFF' 
              : '1px solid #cccccc',
          transition: 'border 0.2s ease',
          width: '100%',
          height: '100%',
        }}
      >
        <NodeResizer
          color={selected ? '#007AFF' : 'transparent'}
          isVisible={selected}
          minWidth={50}
          minHeight={50}
          maxWidth={2000}
          maxHeight={2000}
          keepAspectRatio={false}
        />
        
        {/* Frame Title - always visible, zoom-independent */}
        <NodeToolbar
          isVisible={true}
          position={Position.Top}
          offset={10}
          align="start"
        >
          <div style={{
            fontSize: '12px',
            color: selected ? '#007AFF' : '#888',
            fontWeight: 'normal',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </div>
        </NodeToolbar>

        {/* Size Toolbar - only visible when selected */}
        {selected && (
          <NodeToolbar
            isVisible={selected}
            position={Position.Bottom}
            offset={7}
          >
            <div style={{
              background: '#007AFF',
              color: 'white',
              padding: '1px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'normal',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
            }}>
              {width} × {height}
            </div>
          </NodeToolbar>
        )}
      </div>
    );
  }
);
LabeledFrameGroupNode.displayName = "LabeledFrameGroupNode";