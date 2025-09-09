import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface ContextMenuProps {
    id: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    mousePosition: { x: number; y: number };
    reactFlowInstance: any;
    [key: string]: any;
}

export default function ContextMenu({
    id,
    top,
    left,
    right,
    bottom,
    mousePosition,
    reactFlowInstance,
    ...props
}: ContextMenuProps) {
    const { getNode, addNodes } = useReactFlow();
    const { copySelectedNode, pasteNodes, deleteSelectedNode } = useCanvasStore(state => ({
        copySelectedNode: state.copySelectedNode,
        pasteNodes: state.pasteNodes,
        deleteSelectedNode: state.deleteSelectedNode
    }));

    const duplicateNode = useCallback(() => {
        copySelectedNode();
        setTimeout(() => {
            // Use exact same logic as Ctrl+V
            if (reactFlowInstance) {
                const flowPosition = reactFlowInstance.screenToFlowPosition({
                    x: mousePosition.x,
                    y: mousePosition.y
                });
                pasteNodes(flowPosition);
            }
        }, 10);
    }, [copySelectedNode, pasteNodes, reactFlowInstance, mousePosition]);

    const copyNode = useCallback(() => {
        copySelectedNode();
    }, [copySelectedNode]);

    const pasteNode = useCallback(() => {
        // Use exact same logic as Ctrl+V
        if (reactFlowInstance) {
            const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: mousePosition.x,
                y: mousePosition.y
            });
            pasteNodes(flowPosition);
        }
    }, [pasteNodes, reactFlowInstance, mousePosition]);

    const deleteNode = useCallback(() => {
        deleteSelectedNode();
    }, [deleteSelectedNode]);

    return (
        <div
            style={{
                position: 'absolute',
                top,
                left,
                right,
                bottom,
                background: '#0d0d0d',
                border: '1px solid #1d1d1d',
                borderRadius: '12px',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
                width: '220px',
                padding: '6px',
                zIndex: 1000
            }}
            className="context-menu"
            {...props}
        >
            <div
                style={{
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#007AFF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={copyNode}
            >
                <span>Copy</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>Ctrl+C</span>
            </div>
            <div
                style={{
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#007AFF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={pasteNode}
            >
                <span>Paste</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>Ctrl+V</span>
            </div>
            <div
                style={{
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#007AFF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={duplicateNode}
            >
                <span>Duplicate</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>Ctrl+D</span>
            </div>
            <div
                style={{
                    padding: '6px 10px',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#007AFF'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={deleteNode}
            >
                <span>Delete</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>⌫</span>
            </div>
        </div>
    );
}