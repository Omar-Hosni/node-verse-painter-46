import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

export const RectangleNode = (({ id, data, selected }) => {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);

  const [width, setWidth] = useState(data.width ?? 120);
  const [height, setHeight] = useState(data.height ?? 80);

  useEffect(() => {
    updateNodeData(id, { width, height });
  }, [width, height]);

  return (
    <div
      style={{ width, height }}
      className={`relative bg-blue-500 border ${
        selected ? 'border-blue-400' : 'border-white'
      } rounded-md`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={30}
        minHeight={30}
        lineClassName="stroke-white/50"
        handleClassName="bg-white"
        onResize={(event, params) => {
          setWidth(params.width);
          setHeight(params.height);
        }}
      />
    </div>
  );
});
