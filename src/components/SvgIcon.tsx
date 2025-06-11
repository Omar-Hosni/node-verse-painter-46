// components/SvgIcon.tsx
import React from 'react';

interface SvgIconProps {
  name: string;
  className?: string;
}

const SvgIcon: React.FC<SvgIconProps> = ({ name, className }) => (
  <img
    src={`/nodes/data/icons/${name}.svg`}
    className={className || 'w-5 h-5'}
    draggable={false}
    onError={(e) => {
      // Optional: fallback if missing
      (e.target as HTMLImageElement).src = "/fallback.svg";
    }}
  />
);

export default SvgIcon;
