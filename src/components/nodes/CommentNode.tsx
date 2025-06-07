// CommentNode.tsx
import React from 'react';

interface CommentNodeProps {
  id:string,
  data: {
    text?: string;
    color?: string;
  };
  selected: boolean;
}

export const CommentNode = ({ data, selected }: CommentNodeProps) => {
  const color = data.color || '#fcd34d'; // yellow
  const text = data.text || 'New Comment';

  return (
    <div
      className={`p-3 rounded-lg shadow-md ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        backgroundColor: color,
        width: 200,
        position: 'relative',
        clipPath: 'polygon(0 0, 100% 0, 100% 85%, 60% 85%, 50% 100%, 40% 85%, 0 85%)',
      }}
    >
      <p className="text-black text-sm">{text}</p>
    </div>
  );
};
