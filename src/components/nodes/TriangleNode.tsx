import { memo, useState, useEffect } from 'react';
import { NodeResizer, Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

export const TriangleNode = (({ id, data, selected }) => {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const [width, setWidth] = useState(data.width ?? 100);
  const [height, setHeight] = useState(data.height ?? 100);

  useEffect(() => {
    updateNodeData(id, { width, height });
  }, [width, height]);

  return (
    <div className="relative" style={{ width, height }}>
      <NodeResizer
        isVisible={selected}
        minWidth={50}
        minHeight={50}
        lineClassName="stroke-white/50"
        handleClassName="bg-white"
        onResize={(event, params) => {
          setWidth(params.width);
          setHeight(params.height);
        }}
      />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
        <polygon points="50,0 100,100 0,100" fill="#f87171" stroke="black" strokeWidth="2" />
      </svg>
    </div>
  );
});
