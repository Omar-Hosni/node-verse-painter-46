import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { LabeledFrameGroupNode } from "@/components/nodes/LabeledFrameGroupNode";

export const LabeledFrameGroupNodeWrapper = memo(({ selected, data }: NodeProps) => {
  return (
    <LabeledFrameGroupNode selected={selected} label={data?.label || 'Label'} data={data} />
  );
});