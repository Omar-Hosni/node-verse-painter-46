import React from 'react';

interface NodeIconProps {
  icon: string; // Emoji or icon character
  iconBgColor: string;
  className?: string;
}

const NodeIcon: React.FC<NodeIconProps> = ({ icon, iconBgColor, className }) => (
  <div
    className={`w-8 h-8 flex items-center justify-center rounded-full text-xl ${className || ''}`}
    style={{ backgroundColor: iconBgColor }}
  >
   <div className="scale-[80%]">{icon}</div>
  </div>
);

export default NodeIcon;
