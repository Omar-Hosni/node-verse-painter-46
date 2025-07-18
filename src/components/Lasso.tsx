import { useRef, type PointerEvent } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { getSvgPathFromStroke } from '@/utils/freehandUtils';

type NodePoints = ([number, number] | [number, number, number])[];
type NodePointObject = Record<string, NodePoints>;

export const Lasso = ({ partial }: { partial: boolean }) => {
  const { screenToFlowPosition, flowToScreenPosition, setNodes } = useReactFlow();
  const { width, height, nodeLookup } = useStore((state) => ({
    width: state.width,
    height: state.height,
    nodeLookup: state.nodeLookup,
  }));

  const canvas = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | undefined | null>(null);
  const nodePoints = useRef<NodePointObject>({});
  const flowPoints = useRef<[number, number][]>([]);

  function handlePointerDown(e: PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    flowPoints.current = [[x, y]];
    console.log('Lasso Flow Location:', x.toFixed(), y.toFixed());

    nodePoints.current = {};
    for (const node of nodeLookup.values()) {
      const { x, y } = node.position; // already in flow space
      const { width = 0, height = 0 } = node.measured;

      console.log('Node Flow Location:', x.toFixed(), y.toFixed());

      nodePoints.current[node.id] = [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
      ];
    }

    ctx.current = canvas.current?.getContext('2d');
    if (!ctx.current) return;
    ctx.current.lineWidth = 1;
    ctx.current.fillStyle = 'rgba(0, 89, 220, 0.08)';
    ctx.current.strokeStyle = 'rgba(0, 89, 220, 0.8)';
  }

  function handlePointerMove(e: PointerEvent) {
  if (e.buttons !== 1) return;

  const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
  flowPoints.current.push([x, y]);

  const canvasRect = canvas.current?.getBoundingClientRect();
  if (!canvasRect || !ctx.current) return;

  const screenPathPoints = flowPoints.current.map(([fx, fy]) => {
    const { x, y } = flowToScreenPosition({ x: fx, y: fy });
    return [x - canvasRect.left, y - canvasRect.top]; // FIXED!
  });

  const path = new Path2D(getSvgPathFromStroke(screenPathPoints));

  ctx.current.clearRect(0, 0, width, height);
  ctx.current.fill(path);
  ctx.current.stroke(path);

  const nodesToSelect = new Set<string>();

  for (const [nodeId, points] of Object.entries(nodePoints.current)) {
    const screenPoints = points.map(([fx, fy]) =>
      flowToScreenPosition({ x: fx, y: fy })
    );

    if (partial) {
      for (const { x, y } of screenPoints) {
        if (ctx.current.isPointInPath(path, x - canvasRect.left, y - canvasRect.top)) {
          nodesToSelect.add(nodeId);
          break;
        }
      }
    } else {
      let allIn = true;
      for (const { x, y } of screenPoints) {
        if (!ctx.current.isPointInPath(path, x - canvasRect.left, y - canvasRect.top)) {
          allIn = false;
          break;
        }
      }
      if (allIn) nodesToSelect.add(nodeId);
    }
  }

  setNodes((nodes) =>
    nodes.map((node) => ({
      ...node,
      selected: nodesToSelect.has(node.id),
    }))
  );
}


  function handlePointerUp(e: PointerEvent) {
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    flowPoints.current = [];
    ctx.current?.clearRect(0, 0, width, height);
  }

  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      className="tool-overlay z-10 absolute"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
};
