// components/SvgIcon.tsx
import React from 'react';

interface SvgIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const SvgIcon: React.FC<SvgIconProps> = ({ name, className, style }) => (
  <img
    src={`/nodes/data/icons/${name}.svg`}
    className={className || 'w-5 h-5'}
    style={style}
    draggable={false}
    onError={(e) => {
      // Optional: fallback if missing
      (e.target as HTMLImageElement).src = "/fallback.svg";
    }}
  />
);

export default SvgIcon;
