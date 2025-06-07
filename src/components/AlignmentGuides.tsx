
import React from 'react';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  nodeId: string;
  alignPart?: 'start' | 'center' | 'end'; // Optional but helps fix visual
}


interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  viewport: Viewport;
}

const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, viewport }) => {
  const { x, y, zoom } = viewport;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {guides.map((guide, index) => {
        if (guide.type === 'horizontal') {
          return (
            <div
              key={`h-${index}`}
              className="absolute w-full border-t border-blue-500 border-dashed"
              style={{
                top: guide.position * zoom + y,
                left: 0,
                opacity: 0.8,
              }}
            />
          );
        } else {
          return (
            <div
              key={`v-${index}`}
              className="absolute h-full border-l border-blue-500 border-dashed"
              style={{
                left:
                    guide.alignPart === 'center'
                    ? guide.position * zoom + x - 0.5 // Centered
                    : guide.alignPart === 'end'
                        ? guide.position * zoom + x - 1 // Shift left by 1px for right edges
                        : guide.position * zoom + x,
                top: 0,
                opacity: 0.8,
              }}
            />
          );
        }
      })}
    </div>
  );
};

export default AlignmentGuides;
