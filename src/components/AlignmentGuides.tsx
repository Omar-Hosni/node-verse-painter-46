
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

// const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, viewport }) => {
//   const { x, y, zoom } = viewport;

//   return (
//     <div className="absolute inset-0 pointer-events-none z-10">
//       {guides.map((guide, index) => {
//         if (guide.type === 'horizontal') {
//           return (
//             <div
//               key={`h-${index}`}
//               className="absolute w-full border-t border-blue-500 border-dashed"
//               style={{
//                 top: guide.position * zoom + y,
//                 left: 0,
//                 opacity: 0.8,
//               }}
//             />
//           );
//         } else {
//           return (
//             <div
//               key={`v-${index}`}
//               className="absolute h-full border-l border-blue-500 border-dashed"
//               style={{
//                 left:
//                     guide.alignPart === 'center'
//                     ? guide.position * zoom + x - 0.5 // Centered
//                     : guide.alignPart === 'end'
//                         ? guide.position * zoom + x - 1 // Shift left by 1px for right edges
//                         : guide.position * zoom + x,
//                 top: 0,
//                 opacity: 0.8,
//               }}
//             />
//           );
//         }
//       })}
//     </div>
//   );
// };

const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides, viewport }) => {
  const { x, y, zoom } = viewport;

  // Pick only 1 guide per axis by priority: center > start > end
  const horizontalGuide = guides.find(g => g.type === 'horizontal' && g.alignPart === 'center')
    || guides.find(g => g.type === 'horizontal' && g.alignPart === 'start')
    || guides.find(g => g.type === 'horizontal' && g.alignPart === 'end');

  const verticalGuide = guides.find(g => g.type === 'vertical' && g.alignPart === 'center')
    || guides.find(g => g.type === 'vertical' && g.alignPart === 'start')
    || guides.find(g => g.type === 'vertical' && g.alignPart === 'end');

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {horizontalGuide && (
        <div
          className="absolute w-full border-t border-blue-500 border-dashed"
          style={{
            top: horizontalGuide.position * zoom + y,
            left: 0,
            opacity: 0.8,
          }}
        />
      )}

      {verticalGuide && (
        <div
          className="absolute h-full border-l border-blue-500 border-dashed"
          style={{
            left:
              verticalGuide.alignPart === 'center'
                ? verticalGuide.position * zoom + x - 0.5
                : verticalGuide.alignPart === 'end'
                ? verticalGuide.position * zoom + x - 1
                : verticalGuide.position * zoom + x,
            top: 0,
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
};


export default AlignmentGuides;
