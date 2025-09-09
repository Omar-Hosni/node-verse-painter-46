import React, { useState, useEffect } from 'react';

interface ReSceneTagMenuProps {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  onClose: () => void;
  onTagSelect: (tag: 'object' | 'scene') => void;
  initialTag?: 'object' | 'scene';
  position: { x: number; y: number };
  unavailableTags?: ('object' | 'scene')[];
}

// Property row - exact copy from RightSidebar
const PropertyRow = React.memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center">
    <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">{label}</label>
    <div className="flex-1 flex gap-1.5 h-[30px]">
      {children}
    </div>
  </div>
));

// Toggle button - modified to handle disabled states
const ToggleButton = React.memo(({
  options,
  value,
  onChange
}: {
  options: { label: string | React.ReactNode; value: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex bg-[#1a1a1a] rounded-full w-full p-0.5" style={{ minHeight: '30px', height: '30px' }}>
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => !option.disabled && onChange(option.value)}
        disabled={option.disabled}
        className={`flex-1 h-full text-sm transition-all flex items-center justify-center rounded-full ${
          option.disabled 
            ? 'text-[#666666] cursor-not-allowed opacity-60'
            : value === option.value
              ? 'bg-[#333333] text-white'
              : 'text-[#9e9e9e] hover:text-white'
        }`}
        style={{ cursor: option.disabled ? 'not-allowed' : 'pointer' }}
      >
        {option.label}
      </button>
    ))}
  </div>
));

// Property section - exact copy from RightSidebar
const PropertySection = React.memo(({ title, children, isFirst = false, className = '' }: { title?: string; children: React.ReactNode; isFirst?: boolean; className?: string }) => (
  <div className={`w-full m-0 px-0 ${isFirst ? '' : 'border-t border-[#1d1d1d]'} ${className}`} style={{ paddingTop: isFirst ? '0px' : '16px', paddingBottom: '16px', gap: '10px', display: 'flex', flexDirection: 'column' }}>
    {title && (
      <h3 className="text-sm font-bold text-white">{title}</h3>
    )}
    {children}
  </div>
));

export default function ReSceneTagMenu({
  onClose,
  onTagSelect,
  initialTag = 'object',
  position,
  unavailableTags = []
}: ReSceneTagMenuProps) {
  const [selectedTag, setSelectedTag] = useState<'object' | 'scene'>(initialTag);

  // Immediately assign the default tag when the menu opens
  useEffect(() => {
    onTagSelect(initialTag);
  }, [onTagSelect, initialTag]);

  const handleTagChange = (tag: string) => {
    const newTag = tag as 'object' | 'scene';
    
    // Don't allow selecting unavailable tags
    if (unavailableTags.includes(newTag)) {
      return;
    }
    
    setSelectedTag(newTag);
    onTagSelect(newTag);
    // Don't close automatically - only close when clicking outside
  };

  const options = [
    { 
      label: 'Object', 
      value: 'object',
      disabled: unavailableTags.includes('object')
    },
    { 
      label: 'Scene', 
      value: 'scene',
      disabled: unavailableTags.includes('scene')
    }
  ];

  return (
    <>
      {/* Invisible overlay to capture clicks outside */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998
        }}
        onClick={onClose}
      />

      {/* Triangle pointer */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y + 6,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid #1d1d1d',
          zIndex: 10000
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y + 7.5,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderBottom: '7px solid #0d0d0d',
          zIndex: 10001
        }}
      />

      {/* Context menu */}
      <div
        style={{
          position: 'fixed',
          left: position.x - 132.5, // Center the 265px wide menu on the mouse pointer
          top: position.y + 13,
          background: '#0d0d0d',
          border: '1px solid #1d1d1d',
          borderRadius: '16px',
          width: '265px',
          zIndex: 9999,
          padding: '14px' // Outer padding for the context menu
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-bold text-white" style={{ marginBottom: '12px' }}>Image Type</h3>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: '#1d1d1d',
            marginBottom: '12px',
          }} />

          <PropertyRow label="This is the">
            <ToggleButton
              options={options}
              value={selectedTag}
              onChange={handleTagChange}
            />
          </PropertyRow>
        </div>
      </div>
    </>
  );
}