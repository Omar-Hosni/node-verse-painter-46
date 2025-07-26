import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

export const CircleNode = memo(({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const width = data.width || 100;
  const height = data.height || 100;
  const size = Math.min(width, height);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: '50%',
        background: '#e11d48',
      }}
      className={`relative border-2 ${selected ? 'border-blue-500' : 'border-dashed border-white/60'}`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={30}
        minHeight={30}
        lineClassName="stroke-white/50"
        handleClassName="bg-white"
        onResize={(_, params) => {
          updateNodeData(id, {
            width: params.width,
            height: params.height,
          });
        }}
      />
    </div>
  );
});
