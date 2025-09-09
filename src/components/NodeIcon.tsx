import React from 'react';

interface NodeIconProps {
  icon: string; // Emoji or icon character
  iconBgColor: string;
  className?: string;
  style?: React.CSSProperties;
}

const NodeIcon: React.FC<NodeIconProps> = ({ icon, iconBgColor, className, style }) => (
  <div
    className={`w-8 h-8 flex items-center justify-center rounded-full text-xl ${className || ''}`}
    style={{ backgroundColor: iconBgColor, ...style }}
  >
   <div className="scale-[80%]">{icon}</div>
  </div>
);

export default NodeIcon;
