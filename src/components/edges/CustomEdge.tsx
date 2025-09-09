
import { type FC } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

const CustomEdge: FC<EdgeProps<Edge<{ tag?: string }>>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeDasharray: '0',
          animation: 'none'
        }}
      />
      <EdgeLabelRenderer>
        {data?.tag && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: '#007AFF',
              color: 'white',
              padding: '14px 16px',
              borderRadius: '24px',
              fontSize: '24px',
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              textTransform: 'capitalize',
              pointerEvents: 'all',
              cursor: 'pointer',
              userSelect: 'none',
              zIndex: 999999999
            }}
            className="nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();

              const tagClickEvent = new CustomEvent('edgeTagClick', {
                detail: {
                  edgeId: id,
                  position: { x: event.clientX, y: event.clientY }
                }
              });
              window.dispatchEvent(tagClickEvent);
            }}
          >
            {data.tag}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
