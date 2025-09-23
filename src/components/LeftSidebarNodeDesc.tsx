// @ts-nocheck
import React from 'react';
import { Button } from './ui/button';
import { NodeType, NodeOption } from '@/store/types';
import { useReactFlow } from '@xyflow/react';
import { getHighestOrder } from '@/store/nodeActions';
import { useCanvasStore } from '@/store/useCanvasStore';
import { insertCategories } from './nodes/data/left_sidebar';
import { FaPlus } from "react-icons/fa6";

// PrimaryButton component - same as RightSidebar
const PrimaryButton = React.memo(({
  onClick,
  children,
  icon: Icon,
  disabled = false,
  className = ""
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 justify-center transition-colors ${className}`}
    style={{
      backgroundColor: disabled ? `##808080` : '#007AFF',
      minHeight: '30px',
      height: '30px'
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = '#0056CC';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = '#007AFF';
      }
    }}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
));

interface LeftSidebarNodeDescProps {
  selectedInsertNode: NodeOption | null;
  setSelectedInsertNode: (node: NodeOption | null) => void;
}

const LeftSidebarNodeDesc: React.FC<LeftSidebarNodeDescProps> = ({ selectedInsertNode, setSelectedInsertNode }) => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const { getNodes } = useReactFlow();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && event.target && !panelRef.current.contains(event.target as HTMLElement)) {
        setSelectedInsertNode(null);
      }
    };

    if (selectedInsertNode) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedInsertNode, setSelectedInsertNode]);

  if (!selectedInsertNode) return null;

  // Find which category/section this node belongs to
  const nodeCategory = insertCategories.find(category => 
    category.options.some(option => option.type === selectedInsertNode.type)
  );
  const sectionTitle = nodeCategory?.name || 'Unknown';

  const handleAddNode = (nodeType: NodeType) => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const position = reactFlowInstance.screenToFlowPosition(center);
    const order = getHighestOrder(getNodes()) + 1;

    addNode(nodeType, position, order);
    setSelectedInsertNode(null); // Close panel after insert
  };

  const nodeDescVideo = selectedInsertNode?.type === "image-to-image-reangle" ? "/reangle_video.mp4" : "/relight_video.mp4"
  return (
    <div 
      ref={panelRef}
      className="absolute left-[265px] top-0 bottom-0 w-[265px] h-full bg-[#0d0d0d] border-r border-[#1d1d1d] flex flex-col overflow-hidden z-50 shadow-lg"
      style={{ padding: '20px' }}
    >

      {/* Fixed height image preview with background */}
      {selectedInsertNode?.type === "image-to-image-reangle" || selectedInsertNode?.type === "image-to-image-object-relight" ? (
        <video
          src={nodeDescVideo}
          autoPlay
          loop
          muted
          playsInline
          className="w-full rounded-2xl"
          style={{ height: 185, objectFit: "cover", marginBottom: 20 }}
        />
      ) : (
        <img
          src={
            selectedInsertNode.node_desc_image_url
              ? `/nodes/data/icons/description/${selectedInsertNode.node_desc_image_url}.png`
              : selectedInsertNode?.image_url
              ? encodeURI(String(selectedInsertNode.image_url))
              : ""
          }
          alt=""
          className="w-full bg-[#151515]"
          referrerPolicy="no-referrer"       // helps if the server blocks based on Referer
          crossOrigin="anonymous"            // needed only if you later draw to <canvas>
          style={{
            height: 185,
            objectFit: "cover",
            objectPosition: "center",
            marginBottom: 20,
            boxShadow: "0 0 0 6px #151515",
            borderRadius: 16,
            
          }}
        />
      )}




      {/* Section 1: Node Title Section */}
      <div style={{ marginBottom: '28px' }}>
        {/* Node name with section title style */}
        <h4 className="text-white text-sm font-semibold" style={{ marginBottom: '0px' }}>
          {selectedInsertNode.label}
        </h4>
        {/* Node section title with property label style */}
        <p className="text-sm text-[#9e9e9e]">{sectionTitle}</p>
      </div>

      {/* Section 2: Description Section */}
      <div style={{ marginBottom: '28px' }}>
        <p className="text-sm text-[#9e9e9e] leading-snug">
          {selectedInsertNode.description}
        </p>
        <p className="text-sm text-white font-semibold leading-snug">{selectedInsertNode?.instruction}</p>
      </div>

      {/* Section 3: Action Section */}
      <div>
        <PrimaryButton
          disabled={selectedInsertNode?.status === "coming-soon"}
          onClick={() => {
            if(selectedInsertNode?.status !== "coming-soon")
              handleAddNode(selectedInsertNode.type)
          }}
          icon={selectedInsertNode?.status !== "coming-soon" ? FaPlus: ""}
        >
          {selectedInsertNode?.status === "coming-soon" ? "Coming Soon" : "Insert"}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default LeftSidebarNodeDesc;
