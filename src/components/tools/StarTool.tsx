import { useState, type PointerEvent } from 'react';
import { useReactFlow, type XYPosition } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { getHighestOrder } from '@/store/nodeActions';

function getPosition(start: XYPosition, end: XYPosition) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
    };
}

function getDimensions(start: XYPosition, end: XYPosition, zoom: number = 1) {
    const rawWidth = Math.abs(end.x - start.x) / zoom;
    const rawHeight = Math.abs(end.y - start.y) / zoom;

    // Round to nearest 0.5px for clean dimensions
    return {
        width: Math.round(rawWidth * 2) / 2,
        height: Math.round(rawHeight * 2) / 2,
    };
}

// Helper function to generate star path
function generateStarPath(width: number, height: number, starCount: number = 5, starAngle: number = 40) {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2;
    const innerRadius = outerRadius * (starAngle / 100);

    let path = '';

    for (let i = 0; i < starCount * 2; i++) {
        const angle = (i * Math.PI) / starCount - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
            path += `M ${x} ${y}`;
        } else {
            path += ` L ${x} ${y}`;
        }
    }

    path += ' Z';
    return path;
}

export function StarTool() {
    const [start, setStart] = useState<XYPosition | null>(null);
    const [end, setEnd] = useState<XYPosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { screenToFlowPosition, getViewport, getNodes } = useReactFlow();
    const { setActiveTool } = useCanvasStore();

    // Helper function to create a star node
    function createStarNode(position: XYPosition, width: number, height: number) {
        const order = getHighestOrder(getNodes()) + 1;
        const nodeId = `star-node-${Date.now()}`;

        const newNode = {
            id: nodeId,
            type: 'star-node' as const,
            position,
            zIndex: order,
            draggable: true,
            data: {
                type: 'star-node' as const,
                displayName: 'Star',
                order,
                zIndex: order,
                width,
                height,
                right_sidebar: {
                    pin: false,
                    visibility: true,
                    opacity: 100,
                    blendMode: 'normal',
                    fillColor: '#007AFF',
                    strokeColor: '#FFFFFF',
                    strokeWidth: 0,
                    strokeStyle: 'solid' as const,
                    starCount: 5,
                    starAngle: 40,
                    aspectRatioLocked: false,
                    rotation: 0,
                    flipHorizontal: false,
                    flipVertical: false,
                }
            },
            className: 'node-star',
        };

        // Add the node to the store
        const store = useCanvasStore.getState();
        store.saveToHistory();

        const currentNodes = store.nodes;
        const updatedNodes = [
            ...currentNodes.map(node => ({ ...node, selected: false })),
            { ...newNode, selected: true }
        ];

        useCanvasStore.setState({
            nodes: updatedNodes,
            selectedNode: newNode
        });
    }

    function handlePointerDown(e: PointerEvent) {
        // Only handle left mouse button
        if (e.button !== 0) return;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Get coordinates relative to the canvas container
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const startPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setStart(startPos);
        setEnd(startPos); // Initialize end to same position
        setIsDragging(false);
    }

    function handlePointerMove(e: PointerEvent) {
        if (e.buttons !== 1 || !start) return;

        // Get coordinates relative to the canvas container
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const currentPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Check if we've moved enough to consider it a drag (5px threshold)
        const dragDistance = Math.sqrt(
            Math.pow(currentPos.x - start.x, 2) + Math.pow(currentPos.y - start.y, 2)
        );

        if (dragDistance > 5) {
            setIsDragging(true);
        }

        setEnd(currentPos);
    }

    function handlePointerUp(e: PointerEvent) {
        if (!start) return;

        if (isDragging && end) {
            // Handle drag to create star
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const startScreen = { x: start.x + rect.left, y: start.y + rect.top };
            const endScreen = { x: end.x + rect.left, y: end.y + rect.top };

            const position = screenToFlowPosition(getPosition(startScreen, endScreen));
            const dimension = getDimensions(start, end, getViewport().zoom);

            // Only create star if it has meaningful size (at least 10x10 pixels)
            if (dimension.width >= 10 && dimension.height >= 10) {
                createStarNode(position, dimension.width, dimension.height);
            }
        } else {
            // Handle click to create 400x400 star
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const clickScreen = { x: start.x + rect.left, y: start.y + rect.top };
            const clickPosition = screenToFlowPosition(clickScreen);

            // Center the 400x400 star on the click position
            const centeredPosition = {
                x: clickPosition.x - 200, // Half of 400
                y: clickPosition.y - 200  // Half of 400
            };

            createStarNode(centeredPosition, 400, 400);
        }

        // Reset drawing state
        setStart(null);
        setEnd(null);
        setIsDragging(false);

        // Return to select tool after creating star
        setActiveTool('select');
    }

    const rect = start && end && isDragging ? {
        position: getPosition(start, end),
        dimension: getDimensions(start, end),
    } : null;

    return (
        <div
            className="nopan nodrag tool-overlay"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                cursor: 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {rect && (
                <div
                    className="star-preview"
                    style={{
                        position: 'absolute',
                        ...rect.dimension,
                        transform: `translate(${rect.position.x}px, ${rect.position.y}px)`,
                        pointerEvents: 'none',
                    }}
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${rect.dimension.width} ${rect.dimension.height}`}
                        style={{ overflow: 'visible' }}
                    >
                        <path
                            d={generateStarPath(rect.dimension.width, rect.dimension.height, 5, 40)}
                            fill="#007AFF"
                            stroke="none"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}