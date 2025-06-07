import React, { forwardRef, HTMLAttributes, ReactNode } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
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
  ({ selected, label, data, ...props }, ref) => {
    //const backgroundColor = data?.color || '#ffffff80'; // fallback to semi-transparent white
    const backgroundColor = null;
    
    return (
      <div className="relative w-full h-full">
        {/* Label panel outside the node */}
        <div className="absolute -top-7 left-0 flex justify-center">
          <LabeledFrameGroupNodeLabel>{label}</LabeledFrameGroupNodeLabel>
        </div>

        {/* Node body with resizer */}
        <div
          ref={ref}
          {...props}
          className="relative h-full rounded-sm border-4 shadow"
          style={{ backgroundColor }}
        >
          <NodeResizer
            isVisible={selected}
            minWidth={100}
            minHeight={50}
            lineClassName="stroke-white/50"
            handleClassName="bg-white"
          />
        </div>
      </div>
    );
  }
);
LabeledFrameGroupNode.displayName = "LabeledFrameGroupNode";