import React from 'react';
import { NodeType } from '@/store/types';
import { FaPlus } from "react-icons/fa6";

// PrimaryButton component - same as RightSidebar and LeftSidebarNodeDesc
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
            backgroundColor: disabled ? undefined : '#007AFF',
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

interface NodeDescContentProps {
    title: string;
    sectionTitle: string;
    description: string;
    imageUrl?: string;
    buttonText: string;
    buttonIcon?: React.ComponentType<{ className?: string }>;
    onButtonClick: () => void;
}

const NodeDescContent: React.FC<NodeDescContentProps> = ({
    title,
    sectionTitle,
    description,
    imageUrl,
    buttonText,
    buttonIcon = FaPlus,
    onButtonClick
}) => {
    return (
        <>
            {/* Fixed height image preview with background */}
            <div
                className="w-full bg-[#151515]"
                style={{
                    height: '185px',
                    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    marginBottom: '20px',
                    boxShadow: '0 0 0 6px #151515',
                    borderRadius: '16px'
                }}
            />

            {/* Section 1: Node Title Section */}
            <div style={{ marginBottom: '28px' }}>
                {/* Node name with section title style */}
                <h4 className="text-white text-sm font-semibold" style={{ marginBottom: '0px' }}>
                    {title}
                </h4>
                {/* Node section title with property label style */}
                <p className="text-sm text-[#9e9e9e]">{sectionTitle}</p>
            </div>

            {/* Section 2: Description Section */}
            <div style={{ marginBottom: '28px' }}>
                <p className="text-sm text-[#9e9e9e] leading-snug">
                    {description}
                </p>
            </div>

            {/* Section 3: Action Section */}
            <div>
                <PrimaryButton
                    onClick={onButtonClick}
                    icon={buttonIcon}
                >
                    {buttonText}
                </PrimaryButton>
            </div>
        </>
    );
};

export default NodeDescContent;