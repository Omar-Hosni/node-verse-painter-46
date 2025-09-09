import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, useUpdateNodeInternals, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface TextNodeData {
  displayName?: string;
  width?: number;
  height?: number;
  right_sidebar?: {
    pin?: boolean;
    font?: string;
    weight?: string;
    fontSize?: number;
    align?: 'left' | 'center' | 'right';
    lineSpacing?: number;
    letterSpacing?: number;
    visibility?: boolean;
    opacity?: number;
    blendMode?: string;
    color?: string;
    text?: string;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    hugMode?: boolean;
  };
  color?: string;
  icon?: string;
}

const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected, id }) => {
  const { updateNodeData } = useCanvasStore();
  const { getZoom } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data?.right_sidebar?.text || 'Text');
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());
  const updateNodeInternals = useUpdateNodeInternals();

  // Simple resizing state - always use fixed dimensions
  const [visualWidth, setVisualWidth] = useState(data?.width || 200);
  const [visualHeight, setVisualHeight] = useState(data?.height || 100);
  const [storeWidth, setStoreWidth] = useState(data?.width || 200);
  const [storeHeight, setStoreHeight] = useState(data?.height || 100);
  const isResizing = useRef(false);

  // Get text properties with defaults
  const textProps = data?.right_sidebar || {};
  const {
    font = 'Inter',
    weight = '400',
    fontSize = 32,
    align = 'left',
    lineSpacing = 1.2,
    letterSpacing = 0,
    visibility = true,
    opacity = 100,
    blendMode = 'normal',
    color = '#FFFFFF',
    text = 'New Text',
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
    hugMode = true
  } = textProps;

  const [fontLoaded, setFontLoaded] = useState(font === 'Inter'); // Inter is always available

  // Track zoom changes in real time - when selected or hovered for performance
  useEffect(() => {
    if (!selected && !isHovered) return; // Only track zoom when selected or hovered

    let animationFrameId: number;

    const updateZoom = () => {
      const newZoom = getZoom();
      if (newZoom !== currentZoom) {
        setCurrentZoom(newZoom);
      }
      animationFrameId = requestAnimationFrame(updateZoom);
    };

    animationFrameId = requestAnimationFrame(updateZoom);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getZoom, currentZoom, selected, isHovered]);

  // Update store dimensions when they change (not during active resize)
  useEffect(() => {
    if (!isResizing.current) {
      updateNodeData(id, {
        width: storeWidth,
        height: storeHeight
      });
    }
  }, [storeWidth, storeHeight, id, updateNodeData]);

  // Update dimensions when data changes
  useEffect(() => {
    setVisualWidth(data?.width || 200);
    setVisualHeight(data?.height || 100);
    setStoreWidth(data?.width || 200);
    setStoreHeight(data?.height || 100);
  }, [data?.width, data?.height]);

  // Load Google Font dynamically with proper loading detection
  useEffect(() => {
    if (font === 'Inter') {
      setFontLoaded(true);
      return;
    }

    if (font && font !== 'Inter') {
      setFontLoaded(false); // Reset font loaded state

      // Check if font link already exists
      const existingLink = document.querySelector(`link[href*="${font.replace(' ', '+')}"]`);
      if (existingLink) {
        // Font is already loading or loaded, check if it's ready
        if (document.fonts && document.fonts.check) {
          const fontFace = `${weight} ${fontSize}px "${font}"`;
          if (document.fonts.check(fontFace)) {
            setFontLoaded(true);
            return;
          }
        }
      }

      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
      link.rel = 'stylesheet';

      // Simple timeout-based loading detection
      document.head.appendChild(link);

      // Use Font Loading API if available
      if (document.fonts && document.fonts.load) {
        const fontFace = `${weight} ${fontSize}px "${font}"`;
        document.fonts.load(fontFace).then(() => {
          setFontLoaded(true);
        }).catch(() => {
          // Fallback if font loading fails - still show the font after timeout
          setTimeout(() => setFontLoaded(true), 500);
        });
      } else {
        // Simple fallback - assume font loads within 500ms
        setTimeout(() => setFontLoaded(true), 500);
      }

      return () => {
        // Only remove if we added it and it's not being used by other components
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [font, weight, fontSize]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditText(newText);
    
    // Update the properties panel text in real-time as you type
    // This will trigger the existing hug mode logic in RightSidebar
    updateNodeData(id, {
      right_sidebar: {
        ...data?.right_sidebar,
        text: newText
      }
    });
  };

  const handleTextSubmit = () => {
    updateNodeData(id, {
      right_sidebar: {
        ...data?.right_sidebar,
        text: editText
      }
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setEditText(text);
      setIsEditing(false);
    }
  };

  const textStyle: React.CSSProperties = {
    fontFamily: fontLoaded ? font : 'Inter',
    fontWeight: weight,
    fontSize: `${fontSize}px`,
    lineHeight: lineSpacing,
    letterSpacing: `${letterSpacing}px`,
    color: color,
    opacity: opacity / 100,
    mixBlendMode: blendMode as any,
    display: visibility ? 'block' : 'none',
    whiteSpace: 'pre-wrap', // Preserve line breaks and allow wrapping
    userSelect: 'none',
    cursor: 'pointer',
    margin: 0,
    padding: 0,
    wordWrap: 'break-word'
  };

  // Container style - simple fixed size
  const containerStyle: React.CSSProperties = {
    width: visualWidth,
    height: visualHeight,
    position: 'relative',
    background: 'transparent',
    border: 'none', // Remove CSS border completely
    borderRadius: '0px',
    overflow: 'visible',
    boxSizing: 'border-box',
    display: 'block'
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Text content */}
      {isEditing ? (
        <textarea
          value={editText}
          onChange={handleTextChange}
          onBlur={handleTextSubmit}
          onKeyDown={handleKeyDown}
          style={{
            fontFamily: fontLoaded ? font : 'Inter',
            fontWeight: weight,
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
            letterSpacing: `${letterSpacing}px`,
            color: color,
            opacity: opacity / 100,
            mixBlendMode: blendMode as any,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
            margin: 0,
            width: '100%',
            height: '100%',
            resize: 'none',
            boxSizing: 'border-box',
            textAlign: align,
            display: 'block',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'hidden',
            transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
            transformOrigin: 'center center'
          }}
          autoFocus
        />
      ) : (
        <div ref={textRef} style={{
          ...textStyle,
          width: '100%',
          height: '100%',
          textAlign: align,
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
          transformOrigin: 'center center'
        }}>
          {text}
        </div>
      )}

      {/* Custom SVG Border Overlay - always present for smooth transitions */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 99999999 // High z-index to ensure it's on top
        }}
        viewBox={`0 0 ${visualWidth} ${visualHeight}`}
      >
        {/* Border stroke with smooth transitions */}
        <rect
          x={0}
          y={0}
          width={visualWidth}
          height={visualHeight}
          fill="none"
          stroke="#3b82f6"
          strokeOpacity={
            selected
              ? 1
              : isHovered
                ? 0.5
                : 0
          }
          strokeWidth={2 / currentZoom}
          vectorEffect="non-scaling-stroke"
          style={{
            transition: 'stroke-opacity 10ms ease-out',
            transitionDelay: isHovered && !selected ? '5ms' : '0ms'
          }}
        />
      </svg>

      {/* SVG Corner Boxes - zoom relative */}
      {selected && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 999999999999,
            overflow: 'visible'
          }}
          viewBox={`0 0 ${visualWidth} ${visualHeight}`}
        >
          {/* Top-left corner */}
          <rect
            x={-3.5 / currentZoom}
            y={-3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
          {/* Top-right corner */}
          <rect
            x={visualWidth - 3.5 / currentZoom}
            y={-3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
          {/* Bottom-left corner */}
          <rect
            x={-3.5 / currentZoom}
            y={visualHeight - 3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
          {/* Bottom-right corner */}
          <rect
            x={visualWidth - 3.5 / currentZoom}
            y={visualHeight - 3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
        </svg>
      )}

      {/* Resize handles - show when selected */}
      {selected && (
        <>
          <NodeResizer
            isVisible={selected}
            minWidth={1}
            minHeight={1}
            lineStyle={{
              borderColor: 'transparent', // Hide the default border since we use SVG
              borderWidth: '0px'
            }}
            handleStyle={{
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              width: `${8 / currentZoom}px`,
              height: `${8 / currentZoom}px`,
              borderWidth: `${1.5 / currentZoom}px`,
              borderRadius: '0px',
              zIndex: '999999999999',
            }}
            onResizeStart={() => {
              isResizing.current = true;
              
              // Turn off hug mode when user manually resizes
              if (hugMode) {
                updateNodeData(id, {
                  right_sidebar: {
                    ...data?.right_sidebar,
                    hugMode: false
                  }
                });
              }
            }}
            onResize={(_, params) => {
              // Update visual dimensions immediately for smooth UX
              setVisualWidth(params.width);
              setVisualHeight(params.height);
            }}
            onResizeEnd={(_, params) => {
              isResizing.current = false;
              // Update store dimensions only when resize is complete
              setStoreWidth(params.width);
              setStoreHeight(params.height);
            }}
          />
        </>
      )}

      {/* Size display when selected */}
      {selected && (
        <NodeToolbar
          isVisible={selected}
          position="bottom"
          offset={4}
        >
          <div
            style={{
              background: '#007AFF',
              color: 'white',
              padding: '0px 6px',
              borderRadius: '16px',
              fontSize: '10px',
              fontWeight: '500',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            {Math.round(visualWidth || 0)} × {Math.round(visualHeight || 0)}
          </div>
        </NodeToolbar>
      )}

      {/* Node handles - hidden for text nodes as they don't connect */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default TextNode;