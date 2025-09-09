import React, { useEffect, useState, useRef } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";
import {
  Trash,
  Copy,
  ChevronRight,
  Settings,
  Upload,
  Link,
  Eye,
  EyeOff,
  Palette,
  Snowflake,
  RectangleHorizontal,
  RectangleVertical,
  ChevronDown,
  Square,
  Plus,
  Search,
  Pipette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { ScrollArea } from "./ui/scroll-area";
import SvgIcon from "./SvgIcon";
import * as Slider from "@radix-ui/react-slider";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { FaPlus } from "react-icons/fa6";

import EmojiPicker from "emoji-picker-react";
import RiveInput from "./RiveInput";
import { HexColorPicker, RgbaColorPicker } from "react-colorful";

import { detectWorkflows } from "@/utils/connectionUtils";

// Helper function for permissive URL checking
const isUrlLike = (s?: string) =>
  typeof s === "string" &&
  /^(https?:|blob:|data:|file:)/i.test(s) &&
  s.length > 0;

// CSS for emoji picker category headers
const emojiPickerStyles = `
  .EmojiPickerReact .epr-category-label {
    background-color: #0D0D0D !important;
    color: #9e9e9e !important;
    font-size: 0.875rem !important;
  }
  .EmojiPickerReact.epr-dark-theme .epr-category-label {
    background-color: #0D0D0D !important;
    color: #9e9e9e !important;
    font-size: 0.875rem !important;
  }
`;

// ============================================================================
// CLEAN, REUSABLE COMPONENTS FOR PROPERTIES PANELS
// Built for depth control node - ready to be applied to all other nodes
//
// COMPONENT INVENTORY:
//
// ICONS:
// - EyeOpenIcon, EyeClosedIcon - for visibility toggles
// - RectangleIcon, PillIcon - for shape selection
//
// INPUT COMPONENTS:
// - TextInput - basic text input
// - DepthTextInputWithEmoji - text input with emoji picker and divider
// - NumericInput - number input with validation
// - PositionInput - numeric input with X/Y labels
// - LockButton - aspect ratio lock with Shift key behavior
//
// SELECTION COMPONENTS:
// - ToggleButton - for binary/multiple choice (Yes/No, Source/Final map, etc.)
// - CustomSelect - dropdown with custom styling
// - ColorPicker - advanced color picker with modal and swatches
//
// LAYOUT COMPONENTS:
// - PropertyRow - label + input container (85px label width, 30px height)
// - PropertySection - section with title, 10px spacing, 16px padding
//
// DESIGN SYSTEM:
// - Background: #1a1a1a (inputs), #0d0d0d (modals)
// - Border: #1d1d1d
// - Text: white, #9e9e9e (labels)
// - Focus: #333333
// - Spacing: 10px between properties, 6px title bottom padding
// - Border radius: 16px (modals), rounded-full (inputs)
// ============================================================================

// Lock Button Component with Shift key behavior
const LockButton = React.memo(
  ({
    isLocked,
    onToggle,
    style,
  }: {
    isLocked: boolean;
    onToggle: (locked: boolean) => void;
    style?: React.CSSProperties;
  }) => {
    const [isShiftPressed, setIsShiftPressed] = React.useState(false);
    const [originalLockState, setOriginalLockState] = React.useState(isLocked);

    // Handle Shift key events
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift" && !isShiftPressed) {
          setIsShiftPressed(true);
          setOriginalLockState(isLocked);
          // Force lock to be active while Shift is pressed
          if (!isLocked) {
            onToggle(true);
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift" && isShiftPressed) {
          setIsShiftPressed(false);
          // Return to original state when Shift is released
          if (originalLockState !== isLocked) {
            onToggle(originalLockState);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isShiftPressed, isLocked, originalLockState, onToggle]);

    // Determine the effective lock state (locked if naturally locked OR if Shift is pressed)
    const effectiveLockState = isLocked || isShiftPressed;

    return (
      <button
        onClick={() => {
          if (!isShiftPressed) {
            onToggle(!isLocked);
          }
        }}
        className="absolute w-4 h-4 flex items-center justify-center transition-colors"
        style={{
          ...style,
          color: effectiveLockState ? "#007AFF" : "#333333",
        }}
      >
        <svg width="12" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 5V3.5C3 2.67 3.67 2 4.5 2h3C8.33 2 9 2.67 9 3.5V5M2.5 5h7c.28 0 .5.22.5.5v4c0 .28-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </button>
    );
  }
);

// STABLE ICON COMPONENTS - Prevent re-creation on every render
const EyeOpenIcon = React.memo(() => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

const EyeClosedIcon = React.memo(() => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path
      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="1"
      y1="1"
      x2="23"
      y2="23"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

const RectangleIcon = React.memo(() => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <rect
      x="0.5"
      y="0.5"
      width="9"
      height="9"
      rx="2"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
    />
  </svg>
));

const PillIcon = React.memo(() => (
  <svg width="15" height="8" viewBox="0 0 15 8" fill="none">
    <rect
      x="0.5"
      y="0.5"
      width="14"
      height="7"
      rx="3.5"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
    />
  </svg>
));

// ============================================================================
// INPUT COMPONENTS - Clean, consistent input fields
// ============================================================================

// Base input styling - shared across all input components
const baseInputClasses =
  "w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Basic text input component
const TextInput = React.memo(
  ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseInputClasses}
      style={{ minHeight: "30px", height: "30px" }}
    />
  )
);

// Text input with emoji picker - memoized
const TextInputWithEmoji = React.memo(
  ({
    value,
    onChange,
    placeholder,
    selectedNodeId,
    updateNodeData,
    currentIcon,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    selectedNodeId: string;
    updateNodeData: (id: string, data: any) => void;
    currentIcon?: string;
  }) => {
    const [showEmoji, setShowEmoji] = React.useState(false);
    const emojiRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close emoji picker
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          emojiRef.current &&
          !emojiRef.current.contains(event.target as Node)
        ) {
          setShowEmoji(false);
        }
      };

      if (showEmoji) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showEmoji]);

    return (
      <div className="relative w-full h-full" ref={emojiRef}>
        {/* Text input with emoji button */}
        <div className="relative w-full h-full">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={baseInputClasses + " pr-10"}
          />

          {/* Emoji button - fixed positioning */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji(!showEmoji);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-sm"
          >
            {currentIcon || "😀"}
          </button>
        </div>

        {/* Emoji Picker Popover - fixed positioning */}
        {showEmoji && (
          <div
            className="fixed z-[9999]"
            style={{
              right: "269px",
              top: "50%",
              transform: "translateY(-50%) scale(0.8)",
              transformOrigin: "top right",
            }}
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                updateNodeData(selectedNodeId, {
                  icon: emojiData.emoji,
                });
                setShowEmoji(false);
              }}
              theme="dark"
              width={331}
              height={375}
              emojiStyle="native"
              searchDisabled={true}
              previewConfig={{
                showPreview: false,
              }}
              skinTonesDisabled={true}
              style={
                {
                  backgroundColor: "#0D0D0D",
                  borderRadius: "16px",
                  border: "1px solid #1D1D1D",
                  "--epr-category-label-bg-color": "rgba(13, 13, 13, 0.75)",
                } as React.CSSProperties
              }
            />
          </div>
        )}
      </div>
    );
  }
);

// Advanced text input with emoji picker - clean implementation
const DepthTextInputWithEmoji = React.memo(
  ({
    value,
    onChange,
    placeholder,
    selectedNodeId,
    updateNodeData,
    currentIcon,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    selectedNodeId: string;
    updateNodeData: (id: string, data: any) => void;
    currentIcon?: string;
  }) => {
    const [showEmoji, setShowEmoji] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close emoji picker when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setShowEmoji(false);
        }
      };

      if (showEmoji) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showEmoji]);

    return (
      <div ref={containerRef} className="w-full h-full relative">
        {/* Input container with fixed dimensions */}
        <div className="w-full h-[30px] relative bg-[#1a1a1a] rounded-full flex items-center">
          {/* Text input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full bg-transparent rounded-full px-3 pr-12 text-sm text-white outline-none focus:bg-[#333333] placeholder:text-[#9e9e9e]"
          />

          {/* Small divider */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-[#333333]"
            style={{ right: "34px" }}
          ></div>

          {/* Emoji button - completely static */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji(!showEmoji);
            }}
            className="absolute right-2 top-0 bottom-0 w-6 h-6 my-auto flex items-center justify-center cursor-pointer select-none"
          >
            <span className="text-sm leading-none block">
              {currentIcon || "😀"}
            </span>
          </div>
        </div>

        {/* Emoji picker modal */}
        {showEmoji && (
          <div
            className="fixed z-[10000]"
            style={{
              right: "269px",
              top: "50%",
              transform: "translateY(-50%) scale(0.8)",
              transformOrigin: "top right",
            }}
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                updateNodeData(selectedNodeId, {
                  icon: emojiData.emoji,
                });
                setShowEmoji(false);
              }}
              theme="dark"
              width={331}
              height={375}
              emojiStyle="native"
              searchDisabled={true}
              previewConfig={{
                showPreview: false,
              }}
              skinTonesDisabled={true}
              style={
                {
                  backgroundColor: "#0D0D0D",
                  borderRadius: "16px",
                  border: "1px solid #1D1D1D",
                  "--epr-category-label-bg-color": "rgba(13, 13, 13, 0.75)",
                } as React.CSSProperties
              }
            />
          </div>
        )}
      </div>
    );
  }
);

// ============================================================================
// SPECIALIZED INPUT COMPONENTS
// ============================================================================

// Numeric input with validation
const NumericInput = React.memo(
  ({
    value,
    onChange,
    min,
    max,
    step = 1,
    suffix = "",
  }: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
  }) => (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const newValue = parseFloat(e.target.value);
        if (!isNaN(newValue)) {
          onChange(newValue);
        }
      }}
      className={baseInputClasses}
      style={{ minHeight: "30px", height: "30px" }}
    />
  )
);

// Toggle button for binary/multiple choice options
const ToggleButton = React.memo(
  ({
    options,
    value,
    onChange,
  }: {
    options: { label: string | React.ReactNode; value: string }[];
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div
      className="flex bg-[#1a1a1a] rounded-full w-full p-0.5"
      style={{ minHeight: "30px", height: "30px" }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 h-full text-sm transition-all flex items-center justify-center rounded-full ${
            value === option.value
              ? "bg-[#333333] text-white"
              : "text-[#9e9e9e] hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
);

// Dropdown select with custom styling
const CustomSelect = React.memo(
  ({
    options,
    value,
    onChange,
  }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div
      className="relative w-full"
      style={{ minHeight: "30px", height: "30px" }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none appearance-none cursor-pointer"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#1a1a1a] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {/* Custom dropdown triangle */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <polygon points="1,1 7,1 4,4" fill="#9e9e9e" />
        </svg>
      </div>
    </div>
  )
);

// Position input with X/Y labels
const PositionInput = React.memo(
  ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
  }) => {
    // Round to nearest 0.5 for display
    const roundToNearestHalf = (num: number) => Math.round(num * 2) / 2;
    const displayValue = roundToNearestHalf(value);

    return (
      <div className="relative w-full h-full">
        <input
          type="number"
          value={displayValue}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
              onChange(newValue);
            }
          }}
          className={baseInputClasses + " pr-6"}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <span className="text-sm text-[#9e9e9e]">{label}</span>
        </div>
      </div>
    );
  }
);

// Image preview component with integrated mode switcher
const ImagePreviewWithMode = React.memo(
  ({
    src,
    alt = "Preview",
    width = 233,
    height = 140,
    className = "",
    modeValue,
    onModeChange,
  }: {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    className?: string;
    modeValue?: string;
    onModeChange?: (value: string) => void;
  }) => (
    <div className={`${className}`}>
      {/* Image preview */}
      <div
        className="relative rounded-2xl overflow-hidden group"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundImage: src ? `url(${src})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: src ? "transparent" : "#151515",
        }}
      >
        {/* Placeholder when no image */}
        {!src && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {/* App logo - using same styling as PreviewNode */}
            <img
              src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
              alt="App Logo"
              className="h-5 w-auto opacity-40"
            />
            <span className="text-sm text-[#9e9e9e] opacity-50">
              Connect an image
            </span>
          </div>
        )}

        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Mode switcher - 6px distance, no label */}
      {modeValue && onModeChange && (
        <div className="mt-2">
          <ToggleButton
            options={[
              { label: "Source", value: "source" },
              { label: "Final map", value: "final map" },
            ]}
            value={modeValue}
            onChange={onModeChange}
          />
        </div>
      )}
    </div>
  )
);

// Simple image preview component - clean implementation with background image
const ImagePreview = React.memo(
  ({
    src,
    alt = "Preview",
    width = 233,
    height = 140,
    className = "",
  }: {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    <div
      className={`relative rounded-2xl overflow-hidden group ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: src ? "transparent" : "#151515",
      }}
    >
      {/* Placeholder when no image */}
      {!src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* App logo - using same styling as PreviewNode */}
          <img
            src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
            alt="App Logo"
            className="h-5 w-auto opacity-40"
          />
          <span className="text-sm text-[#9e9e9e] opacity-50">
            Connect an image
          </span>
        </div>
      )}

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  )
);

// Primary button component - reusable across the app
const PrimaryButton = React.memo(
  ({
    onClick,
    children,
    icon: Icon,
    disabled = false,
    className = "",
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
      className={`disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 w-full justify-center ${className}`}
      style={{
        backgroundColor: disabled ? "#666666" : "#007AFF",
        minHeight: "30px",
        height: "30px",
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
);

// Image picker component - similar to ColorPicker but for images
const ImagePicker = React.memo(
  ({
    value,
    onChange,
    imageType,
    onImageTypeChange,
    disabled = false,
  }: {
    value?: string;
    onChange: (value: string) => void;
    imageType?: string;
    onImageTypeChange?: (type: string) => void;
    disabled?: boolean;
  }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Handle click outside to close picker
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(event.target as Node)
        ) {
          setShowPicker(false);
        }
      };

      if (showPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showPicker]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
          setShowPicker(false);
        }
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className="relative w-full h-full" ref={pickerRef}>
        <div className="flex items-center gap-1.5 w-full h-full">
          {/* Image thumbnail */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(!showPicker);
            }}
            className="w-[30px] h-[30px] rounded-full border-none outline-none cursor-pointer flex-shrink-0 overflow-hidden"
            style={{
              backgroundImage: value ? `url(${value})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: value ? "transparent" : "#1a1a1a",
            }}
          >
            {!value && (
              <div className="w-full h-full flex items-center justify-center">
                <Upload className="w-3 h-3 text-[#9e9e9e]" />
              </div>
            )}
          </button>

          {/* Text input - constrained width */}
          <div className="flex-1 h-full min-w-0">
            <input
              type="text"
              value="Image"
              readOnly
              className="w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(!showPicker);
              }}
            />
          </div>
        </div>

        {/* Image picker modal */}
        {showPicker && (
          <div
            className="fixed bg-[#0d0d0d] rounded-xl w-[265px]"
            onClick={(e) => e.stopPropagation()}
            style={{
              right: "269px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid #1d1d1d",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            {/* Use PropertySection anatomy but without bottom padding */}
            <div
              className="w-full m-0 px-0"
              style={{
                paddingTop: "0px",
                paddingBottom: "0px",
                gap: "10px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Title */}
              <h3 className="text-sm font-bold text-white">Fill Image</h3>

              {/* Image preview with hover upload button */}
              <div className="relative group">
                <div
                  className="relative rounded-2xl overflow-hidden cursor-pointer flex-shrink-0"
                  style={{
                    width: "233px",
                    height: "150px",
                    minWidth: "233px",
                    minHeight: "150px",
                    maxWidth: "233px",
                    maxHeight: "150px",
                    backgroundImage: value ? `url(${value})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundColor: value ? "transparent" : "#151515",
                    boxSizing: "border-box",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Placeholder when no image */}
                  {!value && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <img
                        src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                        alt="App Logo"
                        className="h-5 w-auto opacity-40"
                      />
                      <span className="text-sm text-[#9e9e9e] opacity-50">
                        Connect an image
                      </span>
                    </div>
                  )}

                  {/* Hover overlay with upload button - gradient from transparent to dark */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <PrimaryButton
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      icon={Upload}
                      className="pointer-events-auto !w-auto"
                    >
                      Upload Image
                    </PrimaryButton>
                  </div>
                </div>
              </div>

              {/* Type property */}
              <PropertyRow label="Type">
                <CustomSelect
                  options={[
                    { label: "Fill", value: "fill" },
                    { label: "Fit", value: "fit" },
                    { label: "Stretch", value: "stretch" },
                  ]}
                  value={imageType || "fill"}
                  onChange={(value) => onImageTypeChange?.(value)}
                />
              </PropertyRow>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    );
  }
);

// Engine picker component - based on ImagePicker pattern
const EnginePicker = React.memo(
  ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (value: string) => void;
  }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close picker - exact same as ImagePicker
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(event.target as Node)
        ) {
          setShowPicker(false);
        }
      };

      if (showPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showPicker]);

    const handleEngineSelect = (engineId: string) => {
      // TODO: Handle engine selection with actual engine data
      onChange(engineId);
      setShowPicker(false);
    };

    return (
      <div className="relative w-full h-full" ref={pickerRef}>
        {/* Engine preview with hover button */}
        <div
          className="relative rounded-2xl overflow-hidden group cursor-pointer"
          style={{
            width: "233px",
            height: "140px",
            backgroundImage: value ? `url(${value})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: value ? "transparent" : "#151515",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
        >
          {/* Placeholder when no engine */}
          {!value && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <img
                src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                alt="App Logo"
                className="h-5 w-auto opacity-40"
              />
              <span className="text-sm text-[#9e9e9e] opacity-50">
                Select an engine
              </span>
            </div>
          )}

          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Replace Engine Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="bg-[#007AFF] text-white text-sm px-4 py-2 rounded-full">
              Replace engine
            </button>
          </div>
        </div>

        {/* Engine picker modal - exact same pattern as ImagePicker */}
        {showPicker && (
          <div
            className="fixed bg-[#0d0d0d] rounded-xl w-[265px]"
            onClick={(e) => e.stopPropagation()}
            style={{
              right: "269px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid #1d1d1d",
              zIndex: 9999,
              padding: "16px",
            }}
          >
            <div
              className="w-full m-0 px-0"
              style={{
                paddingTop: "0px",
                paddingBottom: "0px",
                gap: "10px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Title */}
              <h3 className="text-sm font-bold text-white">Engines</h3>

              {/* Engine Grid - exact same styling as insert panel */}
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="relative bg-[#151515] border border-transparent hover:border-[#007AFF] rounded-2xl px-8 py-6 flex items-center justify-center cursor-pointer flex-col min-h-[110px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEngineSelect(`engine-${index + 1}`);
                    }}
                  >
                    <span className="text-sm text-[#9e9e9e] whitespace-nowrap overflow-hidden text-ellipsis py-2">
                      Engine {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Gear picker component - based on EnginePicker but with search and scrollable content
const GearPicker = React.memo(
  ({
    value,
    onChange,
  }: {
    value?: string;
    onChange: (value: string) => void;
  }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [showDetails, setShowDetails] = React.useState(false);
    const [selectedGear, setSelectedGear] = React.useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close picker - exact same as EnginePicker
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(event.target as Node)
        ) {
          setShowPicker(false);
          // Reset to list view when closing
          setShowDetails(false);
          setSelectedGear(null);
        }
      };

      if (showPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showPicker]);

    const handleGearSelect = (gearId: string) => {
      setSelectedGear(gearId);
      setShowDetails(true);
    };

    const handleBackToList = () => {
      setShowDetails(false);
      setSelectedGear(null);
      setCurrentImageIndex(0); // Reseindex when going back
    };

    // Sample images for the carousel (using node description images)
    const sampleImages = [
      "/nodes/data/icons/description/pose.png",
      "/nodes/data/icons/description/light.png",
      "/nodes/data/icons/description/edge.png",
      "/nodes/data/icons/description/depth.png",
      "/nodes/data/icons/description/re-angle.png",
    ];

    const handlePrevImage = () => {
      setCurrentImageIndex((prev) =>
        prev === 0 ? sampleImages.length - 1 : prev - 1
      );
    };

    const handleNextImage = () => {
      setCurrentImageIndex((prev) =>
        prev === sampleImages.length - 1 ? 0 : prev + 1
      );
    };

    // Generate 30 gear placeholders
    const allGears = Array.from({ length: 30 }, (_, index) => ({
      id: `gear-${index + 1}`,
      name: `Gear ${index + 1}`,
    }));

    // Filter gears based on search term
    const filteredGears = allGears.filter((gear) =>
      gear.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="relative w-full h-full" ref={pickerRef}>
        {/* Gear preview with hover button */}
        <div
          className="relative rounded-2xl overflow-hidden group cursor-pointer"
          style={{
            width: "233px",
            height: "140px",
            backgroundImage: value ? `url(${value})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: value ? "transparent" : "#151515",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
        >
          {/* Placeholder when no gear */}
          {!value && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <img
                src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                alt="App Logo"
                className="h-5 w-auto opacity-40"
              />
              <span className="text-sm text-[#9e9e9e] opacity-50">
                Select a gear
              </span>
            </div>
          )}

          {/* Hover gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Replace Gear Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="bg-[#007AFF] text-white text-sm px-4 py-2 rounded-full">
              Replace gear
            </button>
          </div>
        </div>

        {/* Gear picker modal with horizontal stack approach */}
        {showPicker && (
          <div
            className="fixed bg-[#0d0d0d] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "265px",
              right: "269px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid #1d1d1d",
              zIndex: 9999,
              padding: "16px",
              maxHeight: "600px",
            }}
          >
            {/* Horizontal stack container with transition */}
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                gap: "16px",
                transform: showDetails
                  ? "translateX(-249px)"
                  : "translateX(0px)", // -249px = -(233px width + 16px gap)
              }}
            >
              {/* Content Box - List View */}
              <div className="flex-shrink-0" style={{ width: "231px" }}>
                <div
                  className="w-full m-0 px-0"
                  style={{
                    paddingTop: "0px",
                    paddingBottom: "0px",
                    gap: "10px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Title */}
                  <h3 className="text-sm font-bold text-white">Gears</h3>

                  {/* Search bar - same style as insert panel */}
                  <div className="relative h-[30px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9e9e9e] z-10 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search gears..."
                      className="w-full h-full bg-[#1a1a1a] rounded-full pl-10 pr-3 py-1.5 text-sm text-white placeholder-[#9e9e9e] outline-none"
                    />
                  </div>

                  {/* Scrollable gear grid */}
                  <div
                    className="overflow-y-auto rounded-2xl"
                    style={{ maxHeight: "450px" }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {filteredGears.map((gear) => (
                        <div
                          key={gear.id}
                          className="relative bg-[#151515] border border-transparent hover:border-[#007AFF] rounded-2xl px-8 py-6 flex items-center justify-center cursor-pointer flex-col min-h-[110px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGearSelect(gear.id);
                          }}
                        >
                          <span className="text-sm text-[#9e9e9e] whitespace-nowrap overflow-hidden text-ellipsis py-2">
                            {gear.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* No results message */}
                    {filteredGears.length === 0 && (
                      <div className="text-center text-[#9e9e9e] py-8">
                        No gears found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gear Details Content Box */}
              <div
                className="flex-shrink-0 transition-opacity duration-300"
                style={{ width: "233px", opacity: showDetails ? "100%" : "0%" }}
              >
                <div
                  className="w-full m-0 px-0"
                  style={{
                    paddingTop: "0px",
                    paddingBottom: "0px",
                    paddingRight: "4px",
                    paddingLeft: "4px",
                    gap: "10px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Back button with left triangle */}
                  <button
                    onClick={handleBackToList}
                    className="text-sm font-bold text-white text-left hover:text-[#007AFF] transition-colors flex items-center gap-2"
                  >
                    {/* Left-pointing triangle */}
                    <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
                      <polygon points="4,1 4,7 1,4" fill="currentColor" />
                    </svg>
                    Back
                  </button>

                  {/* Vertical stack with gap: 0 and divider on top */}
                  <div
                    className="border-t border-[#1d1d1d]"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0px",
                      paddingTop: "20px",
                    }}
                  >
                    {/* Image carousel with navigation */}
                    <div className="relative" style={{ marginBottom: "20px" }}>
                      <div
                        className="w-full bg-[#151515] relative overflow-hidden"
                        style={{
                          height: "185px",
                          boxShadow: "0 0 0 6px #151515",
                          borderRadius: "16px",
                        }}
                      >
                        {/* Preloaded images container */}
                        <div
                          className="flex transition-transform duration-300 ease-in-out"
                          style={{
                            width: `${sampleImages.length * 100}%`,
                            height: "100%",
                            transform: `translateX(-${
                              currentImageIndex * (100 / sampleImages.length)
                            }%)`,
                          }}
                        >
                          {sampleImages.map((imageSrc, index) => (
                            <div
                              key={index}
                              className="w-full h-full flex-shrink-0"
                              style={{
                                width: `${100 / sampleImages.length}%`,
                              }}
                            >
                              <img
                                src={imageSrc}
                                alt={`Gear preview ${index + 1}`}
                                className="w-full h-full object-cover"
                                style={{ borderRadius: "16px" }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Left arrow - fixed positioning */}
                        <button
                          onClick={handlePrevImage}
                          style={{
                            position: "absolute",
                            left: "8px",
                            top: "82.5px", // (185px - 20px) / 2 = 82.5px for perfect centering
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(13, 13, 13, 0.4)",
                            backdropFilter: "blur(5px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                            margin: "0",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <svg
                            width="5"
                            height="8"
                            viewBox="0 0 5 8"
                            fill="none"
                          >
                            <polygon points="4,1 4,7 1,4" fill="white" />
                          </svg>
                        </button>

                        {/* Right arrow - fixed positioning */}
                        <button
                          onClick={handleNextImage}
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "82.5px", // (185px - 20px) / 2 = 82.5px for perfect centering
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(13, 13, 13, 0.4)",
                            backdropFilter: "blur(5px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                            margin: "0",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <svg
                            width="5"
                            height="8"
                            viewBox="0 0 5 8"
                            fill="none"
                          >
                            <polygon points="1,1 1,7 4,4" fill="white" />
                          </svg>
                        </button>

                        {/* Dots indicator - inside the image */}
                        <div
                          className="absolute bottom-2 left-1/2 flex gap-1"
                          style={{ transform: "translateX(-50%)" }}
                        >
                          {sampleImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              style={{
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                backgroundColor:
                                  index === currentImageIndex
                                    ? "white"
                                    : "rgba(255, 255, 255, 0.4)",
                                transition: "opacity 0.2s ease",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.8")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Node Title Section */}
                    <div style={{ marginBottom: "28px" }}>
                      {/* Gear name with section title style */}
                      <h4
                        className="text-white text-sm font-semibold"
                        style={{ marginBottom: "0px" }}
                      >
                        {selectedGear
                          ? allGears.find((g) => g.id === selectedGear)?.name ||
                            "Unknown Gear"
                          : "Gear Details"}
                      </h4>
                      {/* Gear section title with property label style */}
                      <p className="text-sm text-[#9e9e9e]">Gears</p>
                    </div>

                    {/* Section 2: Description Section */}
                    <div style={{ marginBottom: "28px" }}>
                      <p className="text-sm text-[#9e9e9e] leading-snug">
                        This is a placeholder description for the selected gear.
                        In the future, this will contain detailed information
                        about the gear's functionality and usage.
                      </p>
                    </div>

                    {/* Section 3: Action Section */}
                    <div>
                      <PrimaryButton
                        onClick={() => {
                          if (selectedGear) {
                            onChange(selectedGear);
                            setShowPicker(false);
                            setShowDetails(false);
                            setSelectedGear(null);
                          }
                        }}
                        icon={FaPlus}
                        className="!w-auto"
                      >
                        Select
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Stroke settings overlay component
const StrokeOverlay = React.memo(
  ({
    isOpen,
    onClose,
    strokeColor,
    strokeWidth,
    strokeStyle,
    onStrokeColorChange,
    onStrokeWidthChange,
    onStrokeStyleChange,
  }: {
    isOpen: boolean;
    onClose: () => void;
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: string;
    onStrokeColorChange: (color: string) => void;
    onStrokeWidthChange: (width: number) => void;
    onStrokeStyleChange: (style: string) => void;
  }) => {
    const overlayRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close overlay
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          overlayRef.current &&
          !overlayRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div
        ref={overlayRef}
        className="fixed bg-[#0d0d0d] rounded-xl w-[265px]"
        onClick={(e) => e.stopPropagation()}
        style={{
          right: "269px",
          top: "50%",
          transform: "translateY(-50%)",
          border: "1px solid #1d1d1d",
          zIndex: 9999,
          padding: "16px",
        }}
      >
        {/* Use PropertySection anatomy but without bottom padding */}
        <div
          className="w-full m-0 px-0"
          style={{
            paddingTop: "0px",
            paddingBottom: "0px",
            gap: "10px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Title */}
          <h3 className="text-sm font-bold text-white">Stroke</h3>
          <PropertyRow label="Color">
            <ColorPicker value={strokeColor} onChange={onStrokeColorChange} />
          </PropertyRow>

          <PropertyRow label="Width">
            <div className="w-full h-full">
              <input
                type="number"
                value={strokeWidth}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  if (!isNaN(newValue) && newValue >= 0) {
                    onStrokeWidthChange(newValue);
                  }
                }}
                className={baseInputClasses}
                min={0}
                max={20}
              />
            </div>
            <div className="w-full h-full flex items-center">
              <CustomSlider
                value={strokeWidth}
                min={0}
                max={20}
                step={1}
                onChange={onStrokeWidthChange}
                className="w-full"
              />
            </div>
          </PropertyRow>

          <PropertyRow label="Style">
            <ToggleButton
              options={[
                { label: "Solid", value: "solid" },
                { label: "Dashed", value: "dashed" },
              ]}
              value={strokeStyle}
              onChange={onStrokeStyleChange}
            />
          </PropertyRow>
        </div>
      </div>
    );
  }
);

// Opacity input component that shows % when not focused
const OpacityInput = React.memo(
  ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value.toString());

    // Update input value when prop changes
    React.useEffect(() => {
      if (!isFocused) {
        setInputValue(value.toString());
      }
    }, [value, isFocused]);

    return (
      <input
        type="text"
        value={isFocused ? inputValue : `${value}%`}
        onChange={(e) => {
          const newValue = e.target.value.replace("%", "");
          setInputValue(newValue);
          const numValue = parseFloat(newValue);
          if (!isNaN(numValue)) {
            onChange(numValue);
          }
        }}
        onFocus={(e) => {
          setIsFocused(true);
          setInputValue(value.toString());
          e.target.select();
        }}
        onBlur={() => {
          setIsFocused(false);
          setInputValue(value.toString());
        }}
        className="w-full h-full bg-transparent text-sm text-[#9e9e9e] text-center outline-none border-none leading-none focus:text-white"
      />
    );
  }
);

// Advanced color picker with modal
const ColorPicker = React.memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close picker
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          pickerRef.current &&
          !pickerRef.current.contains(event.target as Node)
        ) {
          setShowPicker(false);
        }
      };

      if (showPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showPicker]);

    // Apply custom styles to color picker elements with robust detection
    React.useEffect(() => {
      if (showPicker && pickerRef.current) {
        let attempts = 0;
        const maxAttempts = 20;

        const applyStyles = () => {
          attempts++;
          console.log(`Attempt ${attempts} - Applying color picker styles`);

          const colorPicker = pickerRef.current?.querySelector(
            ".react-colorful"
          ) as HTMLElement;
          const saturation = pickerRef.current?.querySelector(
            ".react-colorful__saturation"
          ) as HTMLElement;
          const hue = pickerRef.current?.querySelector(
            ".react-colorful__hue"
          ) as HTMLElement;
          const alpha = pickerRef.current?.querySelector(
            ".react-colorful__alpha"
          ) as HTMLElement;
          const huePointer = pickerRef.current?.querySelector(
            ".react-colorful__hue-pointer"
          ) as HTMLElement;
          const saturationPointer = pickerRef.current?.querySelector(
            ".react-colorful__saturation-pointer"
          ) as HTMLElement;
          const alphaPointer = pickerRef.current?.querySelector(
            ".react-colorful__alpha-pointer"
          ) as HTMLElement;

          console.log("Found elements:", {
            colorPicker: !!colorPicker,
            saturation: !!saturation,
            hue: !!hue,
            alpha: !!alpha,
            huePointer: !!huePointer,
            saturationPointer: !!saturationPointer,
            alphaPointer: !!alphaPointer,
          });

          if (colorPicker) {
            colorPicker.style.setProperty("padding", "0px", "important");
            colorPicker.style.setProperty("border-radius", "0px", "important");
            console.log("Applied colorPicker styles");
          }
          if (saturation) {
            saturation.style.setProperty("margin", "0px 0px 0px", "important");
            saturation.style.setProperty("border-radius", "8px", "important");
            saturation.style.setProperty("border-bottom", "none", "important");
            console.log("Applied saturation styles");
          }
          if (hue) {
            hue.style.setProperty("order", "0", "important");
            hue.style.setProperty("margin", "14px 0px 6px 36px", "important");
            hue.style.setProperty("height", "8px", "important");
            hue.style.setProperty("border-radius", "16px", "important");
            console.log("Applied hue styles");
          }
          if (alpha) {
            alpha.style.setProperty("height", "8px", "important");
            alpha.style.setProperty("border-radius", "16px", "important");
            alpha.style.setProperty("margin", "0px 0px 0px 36px", "important");
            // Custom checkerboard pattern with specified colors
            alpha.style.setProperty("background-color", "#151515", "important");
            alpha.style.setProperty(
              "background-image",
              "linear-gradient(45deg, #797979 25%, transparent 25%), linear-gradient(-45deg, #797979 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #797979 75%), linear-gradient(-45deg, transparent 75%, #797979 75%)",
              "important"
            );
            alpha.style.setProperty("background-size", "8px 8px", "important");
            alpha.style.setProperty(
              "background-position",
              "0 0, 0 4px, 4px -4px, -4px 0px",
              "important"
            );
            console.log("Applied alpha styles");
          }
          if (huePointer) {
            huePointer.style.setProperty("width", "10px", "important");
            huePointer.style.setProperty("height", "10px", "important");
            console.log("Applied huePointer styles");
          }
          if (saturationPointer) {
            saturationPointer.style.setProperty("width", "12px", "important");
            saturationPointer.style.setProperty("height", "12px", "important");
            console.log("Applied saturationPointer styles");
          }
          if (alphaPointer) {
            alphaPointer.style.setProperty("width", "10px", "important");
            alphaPointer.style.setProperty("height", "10px", "important");
            console.log("Applied alphaPointer styles");
          }

          // If not all elements found and we haven't exceeded max attempts, try again
          if ((!colorPicker || !saturation || !hue) && attempts < maxAttempts) {
            setTimeout(applyStyles, 50);
          }
        };

        // Start applying styles
        applyStyles();

        // Also set up a MutationObserver to catch any dynamic changes
        const observer = new MutationObserver(() => {
          if (attempts < maxAttempts) {
            applyStyles();
          }
        });

        if (pickerRef.current) {
          observer.observe(pickerRef.current, {
            childList: true,
            subtree: true,
          });
        }

        return () => {
          observer.disconnect();
        };
      }
    }, [showPicker]);

    // Color name to hex mapping
    const colorMap: Record<string, string> = {
      Black: "#000000",
      Blue: "#0066FF",
      Green: "#00CC66",
      Orange: "#FF6600",
      Purple: "#9966FF",
      Red: "#FF3333",
      Pink: "#FF6699",
      Cyan: "#00CCFF",
    };

    // Predefined color swatches
    const colorSwatches = [
      "#FFFFFF",
      "#FF6699",
      "#FF6600",
      "#FFD700",
      "#00CCFF",
      "#0066FF",
      "#6666FF",
      "#9966FF",
    ];

    // Get hex value for display
    const hexValue = colorMap[value] || value || "#FF6699";

    // Convert hex or rgba to rgba for RgbaColorPicker
    const parseColorToRgba = (color: string) => {
      // Handle rgba format
      const rgbaMatch = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      );
      if (rgbaMatch) {
        return {
          r: parseInt(rgbaMatch[1], 10),
          g: parseInt(rgbaMatch[2], 10),
          b: parseInt(rgbaMatch[3], 10),
          a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
        };
      }

      // Handle hex format
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 1,
          }
        : { r: 255, g: 102, b: 153, a: 1 };
    };

    // Convert rgba to hex
    const rgbaToHex = (rgba: {
      r: number;
      g: number;
      b: number;
      a: number;
    }) => {
      const toHex = (n: number) => {
        const hex = Math.round(n).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
    };

    const rgbaValue = parseColorToRgba(value || "#FF6699");

    return (
      <div className="relative w-full h-full" ref={pickerRef}>
        <div className="flex items-center gap-1.5 w-full h-full">
          {/* Color ball with checkerboard pattern for transparency */}
          <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 relative overflow-hidden">
            {/* Checkerboard pattern wrapper */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: "#151515",
                backgroundImage: `
                                linear-gradient(45deg, #797979 25%, transparent 25%), 
                                linear-gradient(-45deg, #797979 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #797979 75%), 
                                linear-gradient(-45deg, transparent 75%, #797979 75%)
                            `,
                backgroundSize: "10px 10px",
                backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                border: "1px solid #1a1a1a",
              }}
            />
            {/* Color overlay */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(!showPicker);
              }}
              className="absolute inset-0 w-full h-full rounded-full outline-none cursor-pointer"
              style={{
                backgroundColor: value.startsWith("rgba") ? value : hexValue,
                border: "1px solid #1a1a1a",
              }}
            />
          </div>

          {/* Text input - constrained width */}
          <div className="flex-1 h-full min-w-0">
            <input
              type="text"
              value={
                value.startsWith("rgba")
                  ? rgbaToHex(rgbaValue).toUpperCase()
                  : hexValue.toUpperCase()
              }
              onChange={(e) => {
                const newValue = e.target.value;
                onChange(newValue);
              }}
              className="w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333]"
            />
          </div>
        </div>

        {/* Enhanced color picker modal */}
        {showPicker && (
          <div
            className="fixed bg-[#0d0d0d] rounded-xl p-4 w-[265px]"
            onClick={(e) => e.stopPropagation()}
            style={{
              right: "269px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "1px solid #1d1d1d",
              zIndex: 9999,
            }}
          >
            {/* Title */}
            <h3 className="text-sm font-bold text-white mb-2.5">Color</h3>

            {/* Eye dropper tool */}
            <div
              style={{
                position: "absolute",
                left: "14px",
                top: "189px",
                width: "30px",
                height: "30px",
                backgroundColor: "#1a1a1a",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10000,
              }}
              onMouseDown={async (e) => {
                e.stopPropagation();
                if ("EyeDropper" in window) {
                  try {
                    const eyeDropper = new (window as any).EyeDropper();
                    const result = await eyeDropper.open();
                    onChange(result.sRGBHex);
                  } catch (err) {
                    console.log("Eye dropper failed");
                  }
                }
              }}
              title="Pick color from screen"
            >
              <Pipette size={14} style={{ color: "white", opacity: 0.4 }} />
            </div>

            {/* Main color picker */}
            <div className="mb-4">
              <div className="color-picker-container">
                <RgbaColorPicker
                  color={rgbaValue}
                  onChange={(color) => {
                    // Convert RGBA to CSS rgba format to preserve alpha
                    const rgbaString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
                    onChange(rgbaString);
                  }}
                  style={{
                    width: "100%",
                    height: "175px",
                  }}
                />
              </div>
            </div>

            {/* Hex input with opacity */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="text-[#9e9e9e] w-[30px] flex-shrink-0">Hex</span>
              <div className="flex-1 h-[30px] relative">
                <input
                  type="text"
                  value={rgbaToHex(rgbaValue).replace("#", "").toUpperCase()}
                  onChange={(e) => {
                    const newHex = "#" + e.target.value;
                    const newRgba = parseColorToRgba(newHex);
                    // Preserve current alpha when changing hex
                    const rgbaString = `rgba(${newRgba.r}, ${newRgba.g}, ${newRgba.b}, ${rgbaValue.a})`;
                    onChange(rgbaString);
                  }}
                  className="w-full h-full bg-[#1a1a1a] rounded-full px-3 pr-16 py-1.5 text-sm text-white outline-none focus:bg-[#333333]"
                  maxLength={6}
                />

                {/* Small divider */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-[#333333]"
                  style={{ right: "46px" }}
                ></div>

                {/* Opacity percentage - editable input */}
                <div className="absolute right-2 top-0 bottom-0 w-10 h-6 my-auto flex items-center justify-center">
                  <OpacityInput
                    value={Math.round(rgbaValue.a * 100)}
                    onChange={(newOpacity) => {
                      if (newOpacity >= 0 && newOpacity <= 100) {
                        const newRgba = { ...rgbaValue, a: newOpacity / 100 };
                        const rgbaString = `rgba(${newRgba.r}, ${newRgba.g}, ${newRgba.b}, ${newRgba.a})`;
                        onChange(rgbaString);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Color swatches */}
            <div
              className="flex gap-2 border-t border-[#1d1d1d]"
              style={{ paddingTop: "16px" }}
            >
              {colorSwatches.map((color, index) => (
                <button
                  key={index}
                  onClick={() => onChange(color)}
                  className="flex-1 h-7 rounded-lg border-2 border-transparent hover:border-white/40 transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Export ColorPicker for use in other components
export { ColorPicker };

// ============================================================================
// LAYOUT COMPONENTS - Property panel anatomy
// ============================================================================

// Property row - label + input container
const PropertyRow = React.memo(
  ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center">
      <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 flex gap-1.5 h-[30px]">{children}</div>
    </div>
  )
);

// Section container with title and proper spacing
const PropertySection = React.memo(
  ({
    title,
    children,
    isFirst = false,
    className = "",
  }: {
    title?: string;
    children: React.ReactNode;
    isFirst?: boolean;
    className?: string;
  }) => (
    <div
      className={`w-full m-0 px-0 ${
        isFirst ? "" : "border-t border-[#1d1d1d]"
      } ${className}`}
      style={{
        paddingTop: isFirst ? "0px" : "16px",
        paddingBottom: "16px",
        gap: "10px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
      {children}
    </div>
  )
);

const CustomSlider = ({
  value,
  min,
  max,
  step,
  onChange,
  className = "w-[82px]",
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  className?: string;
}) => {
  return (
    <Slider.Root
      className={`relative flex items-center select-none touch-none h-5 ${className}`}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(val) => onChange(val[0])}
    >
      <Slider.Track
        className="relative grow rounded-full h-[2px]"
        style={{ backgroundColor: "#2B2B2B" }}
      >
        <Slider.Range
          className="absolute h-full rounded-full"
          style={{ backgroundColor: "#007AFF" }}
        />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-gray-200 focus:outline-none" />
    </Slider.Root>
  );
};

// Buttons box component for transform actions
const ButtonsBox = React.memo(
  ({
    buttons,
  }: {
    buttons: Array<{
      icon: React.ReactNode;
      onClick: () => void;
      tooltip?: string;
    }>;
  }) => (
    <div className="flex bg-[#1a1a1a] rounded-full w-full h-full">
      {buttons.map((button, index) => (
        <React.Fragment key={index}>
          <button
            data-lov-id={index}
            key={index}
            onClick={button.onClick}
            className="flex-1 h-full flex items-center justify-center text-[#007AFF] hover:bg-[#333333] transition-colors first:rounded-l-full last:rounded-r-full"
            title={button.tooltip}
          >
            {button.icon}
          </button>
          {index < buttons.length - 1 && (
            <div className="w-px h-4 bg-[#333333] my-auto" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
);

// Tags box component with non-editable tag display using flexbox wrap
const TagsBox = React.memo(
  ({
    tags = [],
    onChange,
  }: {
    tags?: string[];
    onChange?: (tags: string[]) => void;
  }) => {
    const defaultTags = [
      "#tags_here",
      "#tags",
      "#tags",
      "#Jhon_weck",
      "#tag_name",
      "#Jhon",
    ];
    const displayTags = tags.length > 0 ? tags : defaultTags;

    const handleTagClick = async (tag: string) => {
      try {
        await navigator.clipboard.writeText(tag);
        toast.success(`Copied "${tag}" to clipboard`);
      } catch (err) {
        console.error("Failed to copy text: ", err);
        toast.error("Failed to copy to clipboard");
      }
    };

    return (
      <div className="w-full">
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#1a1a1a] rounded-3xl">
          {displayTags.map((tag, index) => (
            <div
              key={index}
              onClick={() => handleTagClick(tag)}
              className="h-[30px] bg-[#333333] rounded-full px-3 py-1.5 flex items-center justify-center text-sm text-white hover:text-[#007AFF] whitespace-nowrap cursor-pointer transition-colors duration-200"
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export const RightSidebar = () => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [colorPickerState, setColorPickerState] = useState<{
    nodeId: string | null;
    isOpen: boolean;
  }>({
    nodeId: null,
    isOpen: false,
  });
  const [showStrokeOverlay, setShowStrokeOverlay] = useState(false);

  // ReactFlow instance for viewport calculations
  const { getViewport } = useReactFlow();

  const {
    selectedNode,
    updateNodeData,
    deleteSelectedNode,
    copySelectedNode,
    selectedEdge,
    deleteEdge,
    uploadControlNetImage,
    uploadInputImage,
    setSelectedNode,
    setSelectedNodeById,
    edges,
    nodes,
  } = useCanvasStore();

  // Helper function to check if a node has input connections
  const hasInputConnections = (nodeId: string): boolean => {
    // Check both canvas store and workflow store edges
    const canvasConnections = edges.some((edge) => edge.target === nodeId);
    const workflowConnections = workflowEdges.some(
      (edge) => edge.target === nodeId
    );

    // Use workflow store edges as they should be more up-to-date for preprocessing
    return workflowConnections || canvasConnections;
  };

  // Helper function to check if a ControlNet node has image input connections and should show preprocessed image
  const shouldShowPreprocessedImage = (nodeId: string): boolean => {
    const node =
      workflowNodes.find((n) => n.id === nodeId) ||
      nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log(`❌ shouldShowPreprocessedImage: Node ${nodeId} not found`);
      return false;
    }

    // Only ControlNet nodes (excluding seed-image-lights/light control) should show preprocessed images
    const isControlNetNode =
      (node.data?.type as string)?.startsWith("control-net-") &&
      node.data?.type !== "seed-image-lights" &&
      node.data?.type !== "control-net-lights";
    if (!isControlNetNode) {
      console.log(
        `❌ shouldShowPreprocessedImage: Node ${nodeId} is not a ControlNet node (type: ${node.data?.type})`
      );
      return false;
    }

    // PRIORITY 1: Check for hasPreprocessedImage flag (most reliable indicator)
    const hasPreprocessedFlag = node.data?.hasPreprocessedImage === true;

    // PRIORITY 2: Check for processed image URL from getProcessedImageForNode
    const processedImageUrl = getProcessedImageForNode(nodeId);
    // Enhanced check to exclude placeholder SVGs more thoroughly
    const hasProcessedImageUrl = !!(
      processedImageUrl &&
      processedImageUrl.length > 0 &&
      !processedImageUrl.includes("data:image/svg+xml") &&
      !processedImageUrl.includes("Image Loading") &&
      !processedImageUrl.includes("Loading...")
    );

    // PRIORITY 3: Check for preprocessed data in various locations with enhanced validation
    const hasPreprocessedImageData = !!(
      // Check preprocessedImage object for BOTH guideImageURL and imageURL (fixing property name mismatch)
      (
        (node.data?.preprocessedImage &&
          typeof node.data.preprocessedImage === "object" &&
          // Check for guideImageURL (what PerformanceOptimizer stores)
          (((node.data.preprocessedImage as any).guideImageURL &&
            typeof (node.data.preprocessedImage as any).guideImageURL ===
              "string" &&
            isUrlLike((node.data.preprocessedImage as any).guideImageURL)) ||
            // Check for imageURL (what RunwareService returns)
            ((node.data.preprocessedImage as any).imageURL &&
              typeof (node.data.preprocessedImage as any).imageURL ===
                "string" &&
              isUrlLike((node.data.preprocessedImage as any).imageURL)))) ||
        // Check if preprocessedImage is a string URL
        (typeof node.data?.preprocessedImage === "string" &&
          isUrlLike(node.data.preprocessedImage)) ||
        // Check right_sidebar for preprocessed image
        (node.data?.right_sidebar?.preprocessedImage &&
          isUrlLike(node.data.right_sidebar.preprocessedImage)) ||
        // Check other common image data locations
        (node.data?.processedImageUrl &&
          isUrlLike(node.data.processedImageUrl)) ||
        // Check workflow store for processed images
        (getProcessedImage(nodeId) && isUrlLike(getProcessedImage(nodeId)!))
      )
    );

    const isProcessing = node.data?.isPreprocessing === true;

    console.log(`🔍 shouldShowPreprocessedImage for ${nodeId}:`, {
      isControlNetNode,
      hasPreprocessedFlag,
      hasProcessedImageUrl,
      hasPreprocessedImageData,
      isProcessing,
      nodeType: node.data?.type,
      preprocessedImage: node.data?.preprocessedImage,
      rightSidebarPreprocessed: node.data?.right_sidebar?.preprocessedImage,
      workflowStoreImage: getProcessedImage(nodeId),
    });

    // PRIMARY LOGIC: If we have the flag OR processed image URL OR preprocessed data OR are currently processing, show the preprocessed component
    // This ensures that once preprocessing is completed, the node always shows the preprocessed view even after reselection
    // Enhanced to be more aggressive about showing preprocessed state to prevent false "waiting" states
    if (
      hasPreprocessedFlag ||
      hasProcessedImageUrl ||
      hasPreprocessedImageData ||
      isProcessing
    ) {
      console.log(
        `✅ Showing preprocessed image for ${nodeId} - flag: ${hasPreprocessedFlag}, hasUrl: ${hasProcessedImageUrl}, hasData: ${hasPreprocessedImageData}, isProcessing: ${isProcessing}`
      );
      return true;
    }

    // ENHANCED FALLBACK: If node has connections AND not explicitly in error state, show preprocessed component
    // This helps prevent "Waiting for processing" appearing when preprocessing was completed but flags weren't properly set
    const hasConnections = hasInputConnections(nodeId);
    const hasError = node.data?.hasError === true || node.data?.errorMessage;

    // ADDITIONAL CHECK: Enhanced fallback to prevent false "waiting" states
    // If a node has connections and is not processing and has no explicit error, assume preprocessing should be shown
    // This addresses the issue where unselecting and reselecting a node shows "Waiting for processing" despite completed preprocessing
    if (hasConnections && !hasError && !isProcessing) {
      console.log(
        `✅ Showing preprocessed component for connected node ${nodeId} (enhanced fallback to prevent false waiting state)`
      );
      return true;
    }

    // FINAL FALLBACK: If checkAndTriggerPreprocessing has been called and node has connections,
    // assume preprocessing is done or will be done, show preprocessed view
    // This prevents the "Waiting for processing" state from appearing when preprocessing was already completed
    if (hasConnections) {
      console.log(
        `✅ Connected node ${nodeId} assumed to have preprocessing completed (final fallback)`
      );
      return true;
    }

    console.log(
      `📄 No preprocessed data for ${nodeId}, hasConnections: ${hasConnections}, hasError: ${hasError}`
    );
    return false;
  };

  // Helper function to get connected input image URL for ControlNet nodes
  const getConnectedInputImageForNode = (nodeId: string): string | null => {
    const workflowConnections = workflowEdges.filter(
      (edge) => edge.target === nodeId
    );
    const canvasConnections = edges.filter((edge) => edge.target === nodeId);
    const incomingEdges = [...workflowConnections, ...canvasConnections];

    for (const edge of incomingEdges) {
      const sourceNode =
        workflowNodes.find((n) => n.id === edge.source) ||
        nodes.find((n) => n.id === edge.source);
      if (
        sourceNode &&
        (sourceNode.type === "image-node" ||
          sourceNode.type === "imageInput" ||
          sourceNode.type?.includes("image") ||
          sourceNode.data?.type === "image" ||
          sourceNode.data?.image ||
          sourceNode.data?.imageUrl ||
          sourceNode.data?.imageFile ||
          sourceNode.data?.right_sidebar?.imageUrl ||
          sourceNode.data?.generatedImage ||
          sourceNode.type === "previewNode" ||
          sourceNode.type.includes("preview"))
      ) {
        // Get the image URL from the connected source node
        const sourceData = sourceNode.data as any;
        const imageUrl =
          sourceData?.imageUrl ||
          sourceData?.image ||
          sourceData?.right_sidebar?.imageUrl ||
          sourceData?.right_sidebar?.image ||
          sourceData?.src ||
          sourceData?.url ||
          sourceData?.generatedImage;

        if (imageUrl && typeof imageUrl === "string" && imageUrl.length > 0) {
          console.log(
            `🔗 Found connected input image for ${nodeId}:`,
            imageUrl.substring(0, 50) + "..."
          );
          return imageUrl;
        }
      }
    }

    console.log(`❌ No connected input image found for ${nodeId}`);
    return null;
  };

  // Get workflow store
  const {
    getProcessedImage,
    processedImages,
    edges: workflowEdges,
    nodes: workflowNodes,
    preprocessControlNetImage,
  } = useWorkflowStore();

  // Helper function to get processed image for a node from workflow store
  const getProcessedImageForNode = (nodeId: string): string | null => {
    console.log(`🔍 getProcessedImageForNode called for ${nodeId}`);

    // Get node reference for hasPreprocessedImage flag check
    const node =
      workflowNodes.find((n) => n.id === nodeId) ||
      nodes.find((n) => n.id === nodeId);
    const hasPreprocessedFlag = node?.data?.hasPreprocessedImage === true;

    // ⚠️ Prefer per-node data first to avoid cross-node mixups
    // 1) preprocessedImage object (guideImageURL or imageURL)
    if (
      node?.data?.preprocessedImage &&
      typeof node.data.preprocessedImage === "object"
    ) {
      const obj = node.data.preprocessedImage as any;
      const url = obj.guideImageURL || obj.imageURL;
      if (url && typeof url === "string" && url.length > 0) {
        console.log(
          `✅ Using per-node preprocessedImage for ${nodeId}:`,
          url.substring(0, 50) + "..."
        );
        return url;
      }
    }

    // 2) preprocessedImage as string
    if (
      typeof node?.data?.preprocessedImage === "string" &&
      node.data.preprocessedImage.length > 0
    ) {
      console.log(
        `✅ Using per-node string preprocessedImage for ${nodeId}:`,
        node.data.preprocessedImage.substring(0, 50) + "..."
      );
      return node.data.preprocessedImage;
    }

    // 3) right_sidebar
    if (
      node?.data?.right_sidebar &&
      typeof node.data.right_sidebar === "object"
    ) {
      const rs = node.data.right_sidebar as any;
      const url = rs.preprocessedImage || rs.processedImageUrl;
      if (url && typeof url === "string" && url.length > 0) {
        console.log(
          `✅ Using right_sidebar preprocessedImage for ${nodeId}:`,
          url.substring(0, 50) + "..."
        );
        return url;
      }
    }

    // 4) Finally, fall back to global cache
    const cached = getProcessedImage(nodeId);
    if (cached && typeof cached === "string" && cached.length > 0) {
      console.log(
        `🖼️ Falling back to workflow store cache for ${nodeId}:`,
        cached.substring(0, 50) + "..."
      );
      return cached;
    }

    // Check for preprocessed image data (from ControlNet preprocessing)
    if (!node) {
      console.log(`❌ Node ${nodeId} not found`);
      return null;
    }

    // Debug: Log node data structure for troubleshooting
    console.log(`🔍 Checking preprocessed image for node ${nodeId}:`, {
      hasPreprocessedImage: node.data?.hasPreprocessedImage,
      preprocessedImage: node.data?.preprocessedImage,
      preprocessedImageType: typeof node.data?.preprocessedImage,
      rightSidebarPreprocessed: node.data?.right_sidebar?.preprocessedImage,
      isProcessing: node.data?.isPreprocessing,
      nodeType: node.data?.type,
    });

    console.log(`❌ No preprocessed image found for ${nodeId}`);
    return null;
  };

  // Monitor processed images map size instead of forcing updates to prevent infinite loops
  const processedImagesCount = processedImages.size;

  // Use processedImagesCount as dependency to update when new images are processed
  // This prevents infinite loops while still updating when needed
  React.useEffect(() => {
    // This effect runs when processedImagesCount changes, updating the UI
    // without causing infinite re-renders
  }, [processedImagesCount]);

  // Monitor edges changes and auto-trigger preprocessing for newly connected ControlNet nodes
  // Using a ref to track already triggered nodes to prevent infinite loops
  const triggeredNodesRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    const checkAndTriggerPreprocessing = async () => {
      // Check all ControlNet nodes for new image connections
      const controlNetNodes = [...workflowNodes, ...nodes].filter(
        (node) =>
          node.data?.type?.startsWith("control-net-") &&
          node.data?.type !== "seed-image-lights"
      );

      for (const node of controlNetNodes) {
        // Skip if we already triggered preprocessing for this node
        if (triggeredNodesRef.current.has(node.id)) {
          continue;
        }

        // Check if node has image connections but no processed image and is not currently processing
        const hasConnections = [...workflowEdges, ...edges].some((edge) => {
          if (edge.target !== node.id) return false;
          const sourceNode = [...workflowNodes, ...nodes].find(
            (n) => n.id === edge.source
          );
          return (
            sourceNode &&
            (sourceNode.type === "image-node" ||
              sourceNode.type === "imageInput" ||
              sourceNode.type?.includes("image") ||
              sourceNode.data?.type === "image" ||
              sourceNode.data?.image ||
              sourceNode.data?.imageUrl ||
              sourceNode.data?.imageFile ||
              sourceNode.data?.right_sidebar?.imageUrl)
          );
        });

        const hasProcessedImage = !!(
          node.data?.hasPreprocessedImage ||
          (node.data?.preprocessedImage &&
            (node.data.preprocessedImage as any) &&
            ((node.data.preprocessedImage as any).guideImageURL ||
              (node.data.preprocessedImage as any).imageURL)) ||
          node.data?.right_sidebar?.preprocessedImage ||
          getProcessedImageForNode(node.id)
        );

        const hasSignature =
          typeof node.data?.preprocessSignature === "string" &&
          node.data.preprocessSignature.length > 0;

        const isProcessing = node.data?.isPreprocessing === true;
        const hasError = node.data?.hasError === true;

        // If has connections but no processed image and not processing and no error and no signature, trigger preprocessing
        if (
          hasConnections &&
          !hasProcessedImage &&
          !isProcessing &&
          !hasError &&
          !hasSignature
        ) {
          console.log(
            `Auto-triggering preprocessing for ControlNet node: ${node.id}`
          );
          triggeredNodesRef.current.add(node.id); // Mark as triggered to prevent duplicate calls

          try {
            await preprocessControlNetImage(node.id);
          } catch (error) {
            console.error(
              `Failed to auto-trigger preprocessing for node ${node.id}:`,
              error
            );
            // Remove from triggered set on error so it can be retried
            triggeredNodesRef.current.delete(node.id);
          }
        } else if (hasProcessedImage || hasError) {
          // If the node now has processed image or error, remove it from triggered set
          // so it can be triggered again if connections change
          triggeredNodesRef.current.delete(node.id);
        }
      }
    };

    // Debounce the check to avoid excessive calls
    const timeoutId = setTimeout(checkAndTriggerPreprocessing, 500);
    return () => clearTimeout(timeoutId);
  }, [
    workflowEdges,
    edges,
    workflowNodes,
    nodes,
    preprocessControlNetImage,
    getProcessedImageForNode,
  ]);

  // Close stroke overlay when selectedNode changes (like color and image picker modals)
  React.useEffect(() => {
    setShowStrokeOverlay(false);
  }, [selectedNode?.id]);

  // Removed local aspect ratio lock state - now using node data

  const [isUploading, setIsUploading] = useState(false);
  const [currentSelectedStyle, setCurrentSelectedStyle] = useState("accent");

  const ratioShapeMap: { [key: string]: JSX.Element } = {
    "1:1": (
      <div className="w-3.5 h-3.5 bg-transparent border border-[#767676] rounded-sm aspect-square" />
    ),
    "2:3": (
      <div className="h-3.5 w-auto aspect-[2/3] border border-[#767676] rounded-sm" />
    ),
    "3:2": (
      <div className="w-3.5 h-auto aspect-[3/2] border border-[#767676] rounded-sm" />
    ),
    "9:16": (
      <div className="h-3.5 w-auto aspect-[9/16] border border-[#767676] rounded-sm" />
    ),
    "16:9": (
      <div className="w-3.5 h-auto aspect-[16/9] border border-[#767676] rounded-sm" />
    ),
  };

  const ratioSizeMap: Record<string, { width: number; height: number }> = {
    "1:1": { width: 512, height: 512 },
    "2:3": { width: 512, height: 768 },
    "3:2": { width: 768, height: 512 },
    "9:16": { width: 576, height: 1024 },
    "16:9": { width: 1024, height: 576 },
  };

  // Handle image upload for ControlNet or Input nodes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode) return;

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Update node to indicate upload in progress
      updateNodeData(selectedNode.id, { uploading: true });

      // Different upload function based on node type
      if (selectedNode.type === "controlnetNode") {
        await uploadControlNetImage(selectedNode.id, file);
      } else if (
        selectedNode.type === "inputNode" &&
        selectedNode.data?.inputType === "image"
      ) {
        await uploadInputImage(selectedNode.id, file);
      }

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  // NEW ANATOMY COMPONENTS

  // OLD FUNCTION - keeping for backward compatibility
  const renderNumericInput = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;

    // Safely cast the value to number
    const value = selectedNode.data[property];
    const numericValue = typeof value === "number" ? value : 0;

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="number"
          value={numericValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              updateNodeData(selectedNode.id, { [property]: newValue });
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };

  const renderTextInput = (label: string, property: string) => {
    if (!selectedNode?.data) return null;

    // Safely cast the value to string
    const value = selectedNode.data[property];
    const textValue = typeof value === "string" ? value : "";

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={textValue}
          onChange={(e) =>
            updateNodeData(selectedNode.id, { [property]: e.target.value })
          }
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };

  const renderTypeInput = () => {
    if (!selectedNode) return null;

    const sidebar = selectedNode.data?.right_sidebar || {};
    const sidebarType = sidebar.type || "source";
    const source = sidebar.source || "Image";

    const handleTypeChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...sidebar,
          type: value,
        },
      });
    };

    const handleSourceChange = (value: string) => {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...sidebar,
          source: value,
        },
      });
    };

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Type
        </label>
        <div className="flex bg-[#1e1e1e] rounded-full overflow-hidden border border-[#2a2a2a] mb-4">
          <button
            onClick={() => handleTypeChange("source")}
            className={`flex-1 text-sm py-1.5 px-4 font-medium rounded-full transition-colors duration-200
              ${
                sidebarType === "source"
                  ? "bg-[#2d2d2d] text-white"
                  : "text-gray-500"
              }`}
          >
            Source
          </button>
          <button
            onClick={() => handleTypeChange("final map")}
            className={`flex-1 text-sm py-1.5 px-4 font-medium rounded-full transition-colors duration-200
              ${
                sidebarType === "final map"
                  ? "bg-[#2d2d2d] text-white"
                  : "text-gray-500"
              }`}
          >
            Final map
          </button>
        </div>

        {sidebarType === "source" && (
          <>
            <div className="flex justify-between items-center mb-4 text-sm text-gray-300">
              <span className="font-medium text-gray-400">Source</span>
              <select
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="bg-[#1e1e1e] text-sm text-[#9e9e9e]border border-[#2a2a2a] rounded-2xl w-[145px] h-[32px] px-3 py-1"
              >
                <option value="Image">Image</option>
                <option value="Camera">Camera</option>
                <option value="API">API</option>
              </select>
            </div>

            <div className="flex justify-between items-center mb-2 text-sm text-gray-300">
              <span className="font-medium text-gray-400">Map</span>
              <button
                onClick={() => toast.success("Map inserted into canvas")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 w-[145px]"
              >
                <Upload className="h-4 w-4" /> Insert in canvas
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderImage = (src: string) => {
    return (
      <div className="relative w-[250px] h-[160px] rounded-2xl overflow-hidden group mb-4">
        {/* Image */}
        <img src={src} alt="Preview" className="w-full h-full object-cover" />
        {/* Shadow overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );
  };

  const renderImageInput = (label: string, property: string) => {
    if (!selectedNode) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          updateNodeData(selectedNode.id, { [property]: reader.result });
          toast.success("Image uploaded successfully");
        }
      };
      reader.readAsDataURL(file);
    };

    const imageUrl = selectedNode.data?.[property];

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
        {imageUrl ? (
          <div className="relative mb-2">
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-full h-auto rounded-md"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() =>
                updateNodeData(selectedNode.id, { [property]: null })
              }
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() =>
              document.getElementById("generic-image-upload")?.click()
            }
          >
            <div className="text-center">
              <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Click to upload image</p>
            </div>
            <input
              id="generic-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    );
  };

  const renderColorInput = (label: string, property: string) => {
    if (!selectedNode?.data) return null;

    const value = selectedNode.data[property] ?? "#000000";

    return (
      <div className="flex flex-row mb-4 justify-between items-center">
        <label className="block text-sm font-medium text-[#9e9e9e] mb-1">
          {label}
        </label>
        <input
          type="color"
          value={value}
          onChange={(e) =>
            updateNodeData(selectedNode.id, { [property]: e.target.value })
          }
          className="w-10 h-10 bg-black rounded-full ml-10 mb-1"
        />
        <input
          type="text"
          value={value}
          className="w-[100px] h-[30px] rounded-2xl bg-[#2a2a2a] text-center"
        />
      </div>
    );
  };

  const renderSlider = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;

    const value = selectedNode.data[property];
    const numericValue = typeof value === "number" ? value : 0;

    const generateOptions = () => {
      const options = [];
      for (let i = min; i <= max; i += step) {
        options.push(
          <option key={i} value={i}>
            {i}
            {label === "Zoom" ? "%" : "°"}
          </option>
        );
      }
      return options;
    };

    return (
      <div className="mb-4 flex items-center justify-between w-full">
        {/* Label on the left */}
        <label className="text-sm w-[20px] text-[#9e9e9e]">{label}</label>

        {/* Dropdown + Slider on the right */}
        <div className="flex items-center gap-2 w-[170px] justify-end">
          <input
            value={`${numericValue} ${label === "Zoom" ? "%" : "°"}`}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                [property]: parseFloat(e.target.value),
              })
            }
            className="bg-[#1a1a1a] text-white text-center text-[12px] px-2 py-1 rounded-full w-[80px] h-[30px]"
          />

          <CustomSlider
            value={numericValue}
            min={min}
            max={max}
            step={step}
            onChange={(val) =>
              updateNodeData(selectedNode.id, {
                [property]: val,
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderTextArea = (
      label: string,
      property: string,
      placeholder: string = ""
    ) => {
      if (!selectedNode?.data) return null;

      // Safely cast the value to string
      const sidebar = selectedNode.data.right_sidebar || {};
      const value = sidebar[property];
      const textValue = typeof value === "string" ? value : "";
      
      const updateProperty = selectedNode.data.right_sidebar?.prompt
      return (  
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
          <textarea
            value={textValue}
            placeholder={placeholder}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...sidebar,
                  [property]: e.target.value,  // <-- write to right_sidebar[property]
                },
              })
            }
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
          />
        </div>
      );
    };

  const renderNodePositionInputs = () => {
    if (!selectedNode?.position) return null;

    const pin = selectedNode?.data?.pin ?? false;
    const positions = [
      "left",
      "center-h",
      "right",
      "bottom",
      "center-v",
      "top",
      "between-h",
      "between-v",
    ];

    return (
      <PropertySection title="Position" isFirst={true}>
        {/* Position alignment icons */}
        <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
          {positions.map((p) => (
            <span
              key={p}
              className="inline-flex p-2 rounded-full hover:bg-[#333333] transition cursor-pointer"
            >
              <SvgIcon
                name={`positions/${p}`}
                className="w-5 h-5"
                style={{ color: "#007AFF" }}
              />
            </span>
          ))}
        </div>

        {/* Location */}
        <PropertyRow label="Location">
          <PositionInput
            value={selectedNode.position.x}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                position: {
                  ...selectedNode.position,
                  x: value,
                },
              })
            }
            label="X"
          />
          <PositionInput
            value={selectedNode.position.y}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                position: {
                  ...selectedNode.position,
                  y: value,
                },
              })
            }
            label="Y"
          />
        </PropertyRow>

        {/* Pin Toggle */}
        <PropertyRow label="Pin">
          <ToggleButton
            options={[
              { label: "No", value: "false" },
              { label: "Yes", value: "true" },
            ]}
            value={pin ? "true" : "false"}
            onChange={(value) =>
              updateNodeData(selectedNode.id, { pin: value === "true" })
            }
          />
        </PropertyRow>
      </PropertySection>
    );
  };

  const renderNodeDesignInput = () => {
    if (!selectedNode?.data) return null;

    const {
      skip = false,
      title = "",
      color = "Pink",
      nodeShape = "rectangle",
    } = selectedNode.data;
    const colors = [
      "Black",
      "Blue",
      "Green",
      "Orange",
      "Purple",
      "Red",
      "Pink",
      "Cyan",
    ];

    return (
      <PropertySection title="Node">
        {/* Skip - using visibility toggle with eye icons */}
        <PropertyRow label="Skip">
          <ToggleButton
            options={[
              { label: <EyeOpenIcon />, value: "false" },
              { label: <EyeClosedIcon />, value: "true" },
            ]}
            value={skip ? "true" : "false"}
            onChange={(value) =>
              updateNodeData(selectedNode.id, { skip: value === "true" })
            }
          />
        </PropertyRow>

        {/* Title with emoji picker */}
        <PropertyRow label="Title">
          <DepthTextInputWithEmoji
            value={selectedNode.data?.displayName || ""}
            onChange={(value) =>
              updateNodeData(selectedNode.id, { displayName: value })
            }
            placeholder="Engine title"
            selectedNodeId={selectedNode.id}
            updateNodeData={updateNodeData}
            currentIcon={selectedNode.data?.icon}
          />
        </PropertyRow>

        {/* Color */}
        <PropertyRow label="Color">
          <ColorPicker
            value={selectedNode.data?.iconBgColor || color}
            onChange={(value) => {
              const nodeStyle = selectedNode.data?.nodeStyle || "accent";
              if (nodeStyle === "accent") {
                updateNodeData(selectedNode.id, { iconBgColor: value });
              } else {
                // Fill mode: update both iconBgColor and nodeFillColor
                updateNodeData(selectedNode.id, {
                  iconBgColor: value,
                  nodeFillColor: value,
                });
              }
            }}
          />
        </PropertyRow>

        {/* Style (Accent vs Fill) */}
        <PropertyRow label="Style">
          <ToggleButton
            options={[
              { label: "Accent", value: "accent" },
              { label: "Fill", value: "fill" },
            ]}
            value={selectedNode.data?.nodeStyle || "accent"}
            onChange={(value) => {
              if (value === "fill") {
                // When switching to fill mode, set nodeFillColor to current iconBgColor
                const currentColor = selectedNode.data?.iconBgColor || color;
                updateNodeData(selectedNode.id, {
                  nodeStyle: value,
                  nodeFillColor: currentColor,
                });
              } else {
                // When switching to accent mode, just update nodeStyle
                updateNodeData(selectedNode.id, { nodeStyle: value });
              }
            }}
          />
        </PropertyRow>

        {/* Shape */}
        <PropertyRow label="Shape">
          <ToggleButton
            options={[
              { label: <RectangleIcon />, value: "square" },
              { label: <PillIcon />, value: "rectangle" },
            ]}
            value={nodeShape}
            onChange={(value) =>
              updateNodeData(selectedNode.id, { nodeShape: value })
            }
          />
        </PropertyRow>
      </PropertySection>
    );
  };

  const renderEngineInput = () => {
    if (!selectedNode?.data?.right_sidebar) return null;

    const { right_sidebar } = selectedNode.data;
    const { image_url, accident, quality, ratio, size } = right_sidebar;

    const ratioOptions = ["1:1", "2:3", "3:2", "9:16", "16:9"];

    const defaultSize = ratioSizeMap[ratio || "1:1"];
    const width = size?.width ?? defaultSize.width;
    const height = size?.height ?? defaultSize.height;

    // Custom ratio selector component that preserves the 5 icons
    const RatioSelector = React.memo(() => (
      <div className="flex bg-[#1a1a1a] rounded-full w-full h-full p-0.5">
        {ratioOptions.map((r) => (
          <button
            key={r}
            onClick={() =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  ratio: r,
                },
              })
            }
            className={`flex-1 h-full flex items-center justify-center rounded-full transition-all ${
              ratio === r
                ? "bg-[#333333] text-white"
                : "text-[#9e9e9e] hover:text-white"
            }`}
          >
            {ratioShapeMap[r]}
          </button>
        ))}
      </div>
    ));

    return (
      <PropertySection title="Engine">
        {/* Engine Picker */}
        <div className="mb-2.5">
          <EnginePicker
            value={image_url}
            onChange={(engineId) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  image_url: engineId, // TODO: Replace with actual engine image URL
                },
              })
            }
          />
        </div>

        {/* Accident */}
        <PropertyRow label="Accident">
          <NumericInput
            value={accident || 450}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  accident: value,
                },
              })
            }
            min={0}
            max={1000}
            step={1}
          />
        </PropertyRow>

        {/* Quality */}
        <PropertyRow label="Quality">
          <div className="w-full h-full">
            <NumericInput
              value={quality || 5}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    quality: value,
                  },
                })
              }
              min={1}
              max={10}
              step={1}
            />
          </div>
          <div className="w-full h-full flex items-center">
            <CustomSlider
              value={quality || 5}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    quality: value,
                  },
                })
              }
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </PropertyRow>

        {/* Ratio - using custom component to preserve the 5 icons */}
        <PropertyRow label="Ratio">
          <RatioSelector />
        </PropertyRow>

        {/* Size */}
        <PropertyRow label="Size">
          <PositionInput
            value={width}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  size: {
                    ...right_sidebar.size,
                    width: value,
                  },
                },
              })
            }
            label="W"
          />
          <PositionInput
            value={height}
            onChange={(value) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  size: {
                    ...right_sidebar.size,
                    height: value,
                  },
                },
              })
            }
            label="H"
          />
        </PropertyRow>
      </PropertySection>
    );
  };

  const renderGearInput = () => {
    if (!selectedNode?.data?.right_sidebar) return null;

    const { right_sidebar } = selectedNode.data;
    const { image_url, power = 70, tags = [] } = right_sidebar;

    return (
      <PropertySection title="Gear">
        {/* Gear Picker */}
        <div className="mb-2.5">
          <GearPicker
            value={image_url}
            onChange={(gearId) =>
              updateNodeData(selectedNode.id, {
                right_sidebar: {
                  ...right_sidebar,
                  image_url: gearId, // TODO: Replace with actual gear image URL
                },
              })
            }
          />
        </div>

        {/* Power */}
        <PropertyRow label="Power">
          <div className="w-full h-full">
            <NumericInput
              value={power}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    power: value,
                  },
                })
              }
              min={10}
              max={100}
              step={10}
            />
          </div>
          <div className="w-full h-full flex items-center">
            <CustomSlider
              value={power}
              onChange={(value) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    power: value,
                  },
                })
              }
              min={10}
              max={100}
              step={10}
              className="w-full"
            />
          </div>
        </PropertyRow>

        {/* Tags */}
        <div className="flex items-start mb-2.5">
          <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0 pt-1.5">
            Tags
          </label>
          <div className="flex-1 flex gap-1.5">
            <TagsBox
              tags={tags}
              onChange={(newTags) =>
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    tags: newTags,
                  },
                })
              }
            />
          </div>
        </div>
      </PropertySection>
    );
  };

  // Utility to check if a property exists
  const hasProperty = (property: string) => {
    return (
      (selectedNode?.data && property in selectedNode.data) ||
      (selectedNode?.data?.right_sidebar &&
        property in selectedNode.data?.right_sidebar)
    );
  };

  // Calculate hug dimensions for text nodes
  const calculateHugWidth = (node: any) => {
    if (!node || node.type !== "text-node") return 0;

    const textProps = node.data?.right_sidebar || {};
    const text = textProps.text || "Text";
    const font = textProps.font || "Inter";
    const weight = textProps.weight || "400";
    const fontSize = textProps.fontSize || 16;
    const letterSpacing = textProps.letterSpacing || 0;

    // Create temporary element to measure text width
    const tempElement = document.createElement("span");
    tempElement.style.position = "absolute";
    tempElement.style.visibility = "hidden";
    tempElement.style.whiteSpace = "nowrap";
    tempElement.style.fontFamily = font;
    tempElement.style.fontWeight = weight;
    tempElement.style.fontSize = `${fontSize}px`;
    tempElement.style.letterSpacing = `${letterSpacing}px`;
    tempElement.style.padding = "0";
    tempElement.style.margin = "0";
    tempElement.style.border = "none";
    tempElement.textContent = text;

    document.body.appendChild(tempElement);
    const width = tempElement.getBoundingClientRect().width;
    document.body.removeChild(tempElement);

    // Add fontSize as additional value to the dynamic width
    return Math.round(width + fontSize);
  };

  const calculateHugHeight = (node: any) => {
    if (!node || node.type !== "text-node") return 0;

    const textProps = node.data?.right_sidebar || {};
    const fontSize = textProps.fontSize || 16;
    const lineSpacing = textProps.lineSpacing || 1.2;

    // Hug height = fontSize * lineSpacing
    return Math.round(fontSize * lineSpacing);
  };

  // Helper function to update node data and recalculate hug dimensions if needed
  const updateNodeDataWithHug = (nodeId: string, updates: any) => {
    const node = selectedNode;
    if (node?.data?.right_sidebar?.hugMode && node.type === "text-node") {
      // If hug mode is active, recalculate dimensions immediately
      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          right_sidebar: {
            ...node.data?.right_sidebar,
            ...updates.right_sidebar,
          },
        },
      };
      const hugWidth = calculateHugWidth(updatedNode);
      const hugHeight = calculateHugHeight(updatedNode);

      updateNodeData(nodeId, {
        ...updates,
        width: hugWidth,
        height: hugHeight,
      });
    } else {
      updateNodeData(nodeId, updates);
    }
  };

  // Real-time hug mode: continuously update dimensions when hug mode is active
  useEffect(() => {
    if (
      selectedNode?.data?.right_sidebar?.hugMode &&
      selectedNode.type === "text-node"
    ) {
      const hugWidth = calculateHugWidth(selectedNode);
      const hugHeight = calculateHugHeight(selectedNode);

      // Only update if dimensions have changed to avoid infinite loops
      if (
        selectedNode.data?.width !== hugWidth ||
        selectedNode.data?.height !== hugHeight
      ) {
        updateNodeData(selectedNode.id, {
          width: hugWidth,
          height: hugHeight,
        });
      }
    }
  }, [
    selectedNode?.data?.right_sidebar?.hugMode,
    selectedNode?.data?.right_sidebar?.text,
    selectedNode?.data?.right_sidebar?.font,
    selectedNode?.data?.right_sidebar?.weight,
    selectedNode?.data?.right_sidebar?.fontSize,
    selectedNode?.data?.right_sidebar?.lineSpacing,
    selectedNode?.data?.right_sidebar?.letterSpacing,
    selectedNode?.id,
  ]);

  // Render node-specific controls based on type
  const renderNodeSpecificControls = () => {
    if (!selectedNode) return null;

    // Handle new schema-based nodes
    if (
      selectedNode.type === "normal-node" ||
      selectedNode.type === "layer-image"
    ) {
      return renderSchemaBasedControls();
    }

    // Keep existing controls for backward compatibility
    switch (selectedNode.type) {
      // Frame Node Controls
      case "frame-node": {
        // Check if frame node is a child of a frame (frames can be nested)
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for frame node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 400;
          const nodeHeight = selectedNode.data?.height || 300;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (for nested frames)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Container with lock button */}
              <div className="flex items-center relative">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">
                  Container
                </label>

                {/* Top rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "15px",
                    borderTopLeftRadius: "6px",
                    borderTop: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                {/* Lock button positioned at exact coordinates */}
                <LockButton
                  isLocked={
                    selectedNode.data?.right_sidebar?.aspectRatioLocked || false
                  }
                  onToggle={(newLocked) => {
                    // Store current aspect ratio when locking
                    if (newLocked) {
                      const currentWidth = selectedNode.data?.width || 400;
                      const currentHeight = selectedNode.data?.height || 300;
                      const aspectRatio = currentWidth / currentHeight;

                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          aspectRatioLocked: newLocked,
                          storedAspectRatio: aspectRatio,
                        },
                      });
                    } else {
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          aspectRatioLocked: newLocked,
                        },
                      });
                    }
                  }}
                  style={{
                    left: "64px",
                    top: "28px",
                  }}
                />

                {/* Bottom rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "45px",
                    borderBottomLeftRadius: "6px",
                    borderBottom: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.width || 400) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked =
                            selectedNode.data?.right_sidebar?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.right_sidebar?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newHeight = newValue / storedRatio;
                            const updateData = {
                              width: newValue,
                              height: newHeight,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newValue + 0.1,
                                height: newHeight + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only width when unlocked
                            const updateData = { width: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { width: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">W</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.height || 300) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked =
                            selectedNode.data?.right_sidebar?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.right_sidebar?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newWidth = newValue * storedRatio;
                            const updateData = {
                              width: newWidth,
                              height: newValue,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newWidth + 0.1,
                                height: newValue + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only height when unlocked
                            const updateData = { height: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { height: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>
            </PropertySection>

            {/* Section 2: Style */}
            <PropertySection title="Style">
              <PropertyRow label="Title">
                <TextInput
                  value={selectedNode.data?.right_sidebar?.title || "New Frame"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        title: value,
                      },
                    })
                  }
                  placeholder="Enter frame title"
                />
              </PropertyRow>

              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Rive corn">
                <CustomSelect
                  options={[
                    { label: "All corners", value: "all" },
                    { label: "Top left", value: "topLeft" },
                    { label: "Top right", value: "topRight" },
                    { label: "Bottom left", value: "bottomLeft" },
                    { label: "Bottom right", value: "bottomRight" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.activeCorner ?? "all"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        activeCorner: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Corners">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 0) {
                        const activeCorner =
                          selectedNode.data?.right_sidebar?.activeCorner ??
                          "all";

                        if (activeCorner === "all") {
                          // Update all corners and the main cornerRadius
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              cornerRadius: newValue,
                              corners: {
                                topLeft: newValue,
                                topRight: newValue,
                                bottomLeft: newValue,
                                bottomRight: newValue,
                              },
                            },
                          });
                        } else {
                          // Update specific corner
                          const currentCorners =
                            selectedNode.data?.right_sidebar?.corners || {};
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              corners: {
                                ...currentCorners,
                                [activeCorner]: newValue,
                              },
                            },
                          });
                        }
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    min={0}
                    max={250}
                    step={1}
                    onChange={(value) => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";

                      if (activeCorner === "all") {
                        // Update all corners and the main cornerRadius
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            cornerRadius: value,
                            corners: {
                              topLeft: value,
                              topRight: value,
                              bottomLeft: value,
                              bottomRight: value,
                            },
                          },
                        });
                      } else {
                        // Update specific corner
                        const currentCorners =
                          selectedNode.data?.right_sidebar?.corners || {};
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            corners: {
                              ...currentCorners,
                              [activeCorner]: value,
                            },
                          },
                        });
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Fill">
                <ColorPicker
                  value={
                    selectedNode.data?.right_sidebar?.fillColor || "#ffffff"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        fillColor: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Stroke">
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value="Stroke"
                    readOnly
                    onClick={() => setShowStrokeOverlay(true)}
                    className={baseInputClasses + " cursor-pointer pr-8"}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Plus className="w-3 h-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>

            {/* Export Section */}
            <PropertySection title="Export">
              {/* Render toggle */}
              <PropertyRow label="Render">
                <ToggleButton
                  options={[
                    { label: "Image", value: "image" },
                    { label: "Container", value: "container" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.exportRender || "image"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        exportRender: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Format dropdown */}
              <PropertyRow label="Format">
                <CustomSelect
                  options={[
                    { label: "PNG", value: "png" },
                    { label: "JPEG", value: "jpeg" },
                    { label: "WEBP", value: "webp" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.exportFormat || "png"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        exportFormat: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Ratio dropdown */}
              <PropertyRow label="Ratio">
                <CustomSelect
                  options={[
                    { label: "1X", value: "1x" },
                    { label: "2X", value: "2x" },
                    { label: "4X", value: "4x" },
                    { label: "8X", value: "8x" },
                  ]}
                  value={selectedNode.data?.right_sidebar?.exportRatio || "1x"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        exportRatio: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Export button */}
              <div className="w-full mt-2.5">
                <PrimaryButton
                  onClick={() => {
                    // TODO: Implement export functionality
                    console.log("Export clicked", {
                      render:
                        selectedNode.data?.right_sidebar?.exportRender ||
                        "image",
                      format:
                        selectedNode.data?.right_sidebar?.exportFormat || "png",
                      ratio:
                        selectedNode.data?.right_sidebar?.exportRatio || "1x",
                    });
                  }}
                >
                  Export
                </PrimaryButton>
              </div>
            </PropertySection>
          </>
        );
      }

      // Image Node Controls
      case "image-node": {
        // Check if this ImageNode is connected to an in-painting node
        const hasInpaintingConnection = edges.some((edge) => {
          if (
            edge.source === selectedNode.id ||
            edge.target === selectedNode.id
          ) {
            const otherNodeId =
              edge.source === selectedNode.id ? edge.target : edge.source;
            const otherNode = nodes.find((node) => node.id === otherNodeId);
            if (otherNode) {
              const nodeType = otherNode.type?.toLowerCase() || "";
              const nodeId = otherNode.id?.toLowerCase() || "";
              return (
                nodeType.includes("inpainting") ||
                nodeType.includes("inpaint") ||
                nodeType.includes("in-paint") ||
                nodeId.includes("inpainting") ||
                nodeId.includes("inpaint") ||
                nodeId.includes("in-paint")
              );
            }
          }
          return false;
        });

        // Check if this ImageNode is connected to an out-painting node
        const hasOutpaintingConnection = edges.some((edge) => {
          if (
            edge.source === selectedNode.id ||
            edge.target === selectedNode.id
          ) {
            const otherNodeId =
              edge.source === selectedNode.id ? edge.target : edge.source;
            const otherNode = nodes.find((node) => node.id === otherNodeId);
            if (otherNode) {
              const nodeType = otherNode.type?.toLowerCase() || "";
              const nodeId = otherNode.id?.toLowerCase() || "";
              return (
                nodeType.includes("outpainting") ||
                nodeType.includes("outpaint") ||
                nodeType.includes("out-paint") ||
                nodeId.includes("outpainting") ||
                nodeId.includes("outpaint") ||
                nodeId.includes("out-paint")
              );
            }
          }
          return false;
        });

        // Check if image node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for image node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 200;
          const nodeHeight = selectedNode.data?.height || 200;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position */}
            <PropertySection
              title="Position"
              isFirst={true}
              className={
                hasInpaintingConnection || hasOutpaintingConnection
                  ? "hidden"
                  : ""
              }
            >
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Container with lock button */}
              <div className="flex items-center relative">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">
                  Container
                </label>

                {/* Top rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "15px",
                    borderTopLeftRadius: "6px",
                    borderTop: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                {/* Lock button positioned at exact coordinates */}
                <LockButton
                  isLocked={
                    selectedNode.data?.right_sidebar?.aspectRatioLocked || false
                  }
                  onToggle={(newLocked) => {
                    // Store current aspect ratio when locking
                    if (newLocked) {
                      const currentWidth = selectedNode.data?.width || 200;
                      const currentHeight = selectedNode.data?.height || 200;
                      const aspectRatio = currentWidth / currentHeight;

                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          aspectRatioLocked: newLocked,
                          storedAspectRatio: aspectRatio,
                        },
                      });
                    } else {
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          aspectRatioLocked: newLocked,
                        },
                      });
                    }
                  }}
                  style={{
                    left: "64px",
                    top: "28px",
                  }}
                />

                {/* Bottom rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "45px",
                    borderBottomLeftRadius: "6px",
                    borderBottom: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.width || 200) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked =
                            selectedNode.data?.right_sidebar?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.right_sidebar?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newHeight = newValue / storedRatio;
                            const updateData = {
                              width: newValue,
                              height: newHeight,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newValue + 0.1,
                                height: newHeight + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only width when unlocked
                            const updateData = { width: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { width: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">W</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.height || 200) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked =
                            selectedNode.data?.right_sidebar?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.right_sidebar?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newWidth = newValue * storedRatio;
                            const updateData = {
                              width: newWidth,
                              height: newValue,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newWidth + 0.1,
                                height: newValue + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only height when unlocked
                            const updateData = { height: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { height: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round(
                        (selectedNode.data?.right_sidebar?.rotation || 0) * 2
                      ) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          rotation: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipHorizontal: !(
                              selectedNode.data?.right_sidebar
                                ?.flipHorizontal || false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipVertical: !(
                              selectedNode.data?.right_sidebar?.flipVertical ||
                              false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.right_sidebar?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: currentRotation + 90,
                          },
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Style */}
            <PropertySection
              title="Style"
              className={hasInpaintingConnection ? "hidden" : ""}
            >
              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Rive corn">
                <CustomSelect
                  options={[
                    { label: "All corners", value: "all" },
                    { label: "Top left", value: "topLeft" },
                    { label: "Top right", value: "topRight" },
                    { label: "Bottom left", value: "bottomLeft" },
                    { label: "Bottom right", value: "bottomRight" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.activeCorner ?? "all"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        activeCorner: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Corners">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 0) {
                        const activeCorner =
                          selectedNode.data?.right_sidebar?.activeCorner ??
                          "all";

                        if (activeCorner === "all") {
                          // Update all corners and the main cornerRadius
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              cornerRadius: newValue,
                              corners: {
                                topLeft: newValue,
                                topRight: newValue,
                                bottomLeft: newValue,
                                bottomRight: newValue,
                              },
                            },
                          });
                        } else {
                          // Update specific corner
                          const currentCorners =
                            selectedNode.data?.right_sidebar?.corners || {};
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              corners: {
                                ...currentCorners,
                                [activeCorner]: newValue,
                              },
                            },
                          });
                        }
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    min={0}
                    max={250}
                    step={1}
                    onChange={(value) => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";

                      if (activeCorner === "all") {
                        // Update all corners and the main cornerRadius
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            cornerRadius: value,
                            corners: {
                              topLeft: value,
                              topRight: value,
                              bottomLeft: value,
                              bottomRight: value,
                            },
                          },
                        });
                      } else {
                        // Update specific corner
                        const currentCorners =
                          selectedNode.data?.right_sidebar?.corners || {};
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            corners: {
                              ...currentCorners,
                              [activeCorner]: value,
                            },
                          },
                        });
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </PropertyRow>
              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Fill">
                <ImagePicker
                  value={selectedNode.data?.right_sidebar?.imageUrl}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        imageUrl: value,
                      },
                    })
                  }
                  imageType={
                    selectedNode.data?.right_sidebar?.imageType || "fill"
                  }
                  onImageTypeChange={(type) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        imageType: type,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Stroke">
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value="Stroke"
                    readOnly
                    onClick={() => setShowStrokeOverlay(true)}
                    className={baseInputClasses + " cursor-pointer pr-8"}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Plus className="w-3 h-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>

            {/* OutPaint Padding Controls - Only show when ImageNode is connected to out-painting node */}
            {hasOutpaintingConnection && (
              <PropertySection title="Canvas Padding">
                <PropertyRow label="Top">
                  <NumericInput
                    value={Math.round(
                      selectedNode.data?.right_sidebar?.paddingTop || 0
                    )}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          paddingTop: value,
                        },
                      })
                    }
                    min={0}
                    max={200}
                    suffix="%"
                  />
                </PropertyRow>

                <PropertyRow label="Bottom">
                  <NumericInput
                    value={Math.round(
                      selectedNode.data?.right_sidebar?.paddingBottom || 0
                    )}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          paddingBottom: value,
                        },
                      })
                    }
                    min={0}
                    max={200}
                    suffix="%"
                  />
                </PropertyRow>

                <PropertyRow label="Left">
                  <NumericInput
                    value={Math.round(
                      selectedNode.data?.right_sidebar?.paddingLeft || 0
                    )}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          paddingLeft: value,
                        },
                      })
                    }
                    min={0}
                    max={200}
                    suffix="%"
                  />
                </PropertyRow>

                <PropertyRow label="Right">
                  <NumericInput
                    value={Math.round(
                      selectedNode.data?.right_sidebar?.paddingRight || 0
                    )}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          paddingRight: value,
                        },
                      })
                    }
                    min={0}
                    max={200}
                    suffix="%"
                  />
                </PropertyRow>
              </PropertySection>
            )}

            {/* Brush and Eraser Tool Properties - Only show when ImageNode is connected to in-painting node */}
            {hasInpaintingConnection && (
              <PropertySection title="Brush Tool">
                <PropertyRow label="Size">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.right_sidebar?.brushSize || 8}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 1 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              brushSize: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={selectedNode.data?.right_sidebar?.brushSize || 8}
                      min={1}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            brushSize: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Hardness">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={
                        selectedNode.data?.right_sidebar?.brushHardness ?? 100
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 0 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              brushHardness: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={
                        selectedNode.data?.right_sidebar?.brushHardness ?? 100
                      }
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            brushHardness: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Flow">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.right_sidebar?.brushFlow ?? 100}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 0 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              brushFlow: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={selectedNode.data?.right_sidebar?.brushFlow ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            brushFlow: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>
              </PropertySection>
            )}

            {/* Eraser Tool Properties */}
            {hasInpaintingConnection && (
              <PropertySection title="Eraser Tool">
                <PropertyRow label="Size">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.right_sidebar?.eraserSize || 8}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 1 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              eraserSize: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={1}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={selectedNode.data?.right_sidebar?.eraserSize || 8}
                      min={1}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            eraserSize: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Hardness">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={
                        selectedNode.data?.right_sidebar?.eraserHardness ?? 100
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 0 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              eraserHardness: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={
                        selectedNode.data?.right_sidebar?.eraserHardness ?? 100
                      }
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            eraserHardness: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Opacity">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={
                        selectedNode.data?.right_sidebar?.eraserOpacity ?? 100
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 0 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              eraserOpacity: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={
                        selectedNode.data?.right_sidebar?.eraserOpacity ?? 100
                      }
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            eraserOpacity: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Flow">
                  <div className="w-full h-full">
                    <input
                      type="number"
                      value={
                        selectedNode.data?.right_sidebar?.eraserFlow ?? 100
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (
                          !isNaN(newValue) &&
                          newValue >= 0 &&
                          newValue <= 100
                        ) {
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              eraserFlow: newValue,
                            },
                          });
                        }
                      }}
                      className={baseInputClasses}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="w-full h-full flex items-center">
                    <CustomSlider
                      value={
                        selectedNode.data?.right_sidebar?.eraserFlow ?? 100
                      }
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            eraserFlow: value,
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </PropertyRow>
              </PropertySection>
            )}

            {/* Export Section */}
            <PropertySection title="Export">
              {/* Render toggle */}
              <PropertyRow label="Render">
                <ToggleButton
                  options={[
                    { label: "Image", value: "image" },
                    { label: "Container", value: "container" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.exportRender || "image"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        exportRender: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Format dropdown */}
              <PropertyRow label="Format">
                <CustomSelect
                  options={[
                    { label: "PNG", value: "png" },
                    { label: "JPEG", value: "jpeg" },
                    { label: "WEBP", value: "webp" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.exportFormat || "png"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        exportFormat: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Export button */}
              <div className="w-full mt-2.5">
                <PrimaryButton
                  onClick={() => {
                    // TODO: Implement export functionality
                    console.log("Export clicked", {
                      render:
                        selectedNode.data?.right_sidebar?.exportRender ||
                        "image",
                      format:
                        selectedNode.data?.right_sidebar?.exportFormat || "png",
                    });
                  }}
                >
                  Export
                </PrimaryButton>
              </div>
            </PropertySection>
          </>
        );
      }

      // Text Node Controls
      case "text-node": {
        // Check if text node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for text node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 200;
          const nodeHeight = selectedNode.data?.height || 100;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position - Same as rectangle and circle nodes */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              {/* Container with T button for hug mode */}
              <div className="flex items-center relative">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">
                  Container
                </label>

                {/* Top rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "15px",
                    borderTopLeftRadius: "6px",
                    borderTop: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                {/* T button positioned at exact coordinates for hug mode */}
                <button
                  onClick={() => {
                    const isHugMode =
                      selectedNode.data?.right_sidebar?.hugMode || false;

                    if (!isHugMode) {
                      // Turning hug mode ON - calculate and set dimensions
                      const hugWidth = calculateHugWidth(selectedNode);
                      const hugHeight = calculateHugHeight(selectedNode);

                      updateNodeData(selectedNode.id, {
                        width: hugWidth,
                        height: hugHeight,
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          hugMode: true,
                        },
                      });
                    } else {
                      // Turning hug mode OFF - just toggle the flag
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          hugMode: false,
                        },
                      });
                    }
                  }}
                  className="absolute w-4 h-4 flex items-center justify-center transition-colors"
                  style={{
                    left: "64px",
                    top: "28px",
                    color: selectedNode.data?.right_sidebar?.hugMode
                      ? "#007AFF"
                      : "#333333",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 2h8M6 2v8M4 6h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {/* Bottom rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "45px",
                    borderBottomLeftRadius: "6px",
                    borderBottom: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="text"
                      value={
                        selectedNode.data?.right_sidebar?.hugMode
                          ? "Hug"
                          : selectedNode.data?.width || 200
                      }
                      onChange={(e) => {
                        if (!selectedNode.data?.right_sidebar?.hugMode) {
                          const newValue = parseFloat(e.target.value);
                          if (!isNaN(newValue)) {
                            updateNodeData(selectedNode.id, {
                              width: newValue,
                            });
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      readOnly={selectedNode.data?.right_sidebar?.hugMode}
                      style={{
                        cursor: selectedNode.data?.right_sidebar?.hugMode
                          ? "default"
                          : "text",
                        color: selectedNode.data?.right_sidebar?.hugMode
                          ? "#9e9e9e"
                          : "white",
                      }}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">W</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="text"
                      value={
                        selectedNode.data?.right_sidebar?.hugMode
                          ? "Hug"
                          : selectedNode.data?.height || 100
                      }
                      onChange={(e) => {
                        if (!selectedNode.data?.right_sidebar?.hugMode) {
                          const newValue = parseFloat(e.target.value);
                          if (!isNaN(newValue)) {
                            updateNodeData(selectedNode.id, {
                              height: newValue,
                            });
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      readOnly={selectedNode.data?.right_sidebar?.hugMode}
                      style={{
                        cursor: selectedNode.data?.right_sidebar?.hugMode
                          ? "default"
                          : "text",
                        color: selectedNode.data?.right_sidebar?.hugMode
                          ? "#9e9e9e"
                          : "white",
                      }}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round(
                        (selectedNode.data?.right_sidebar?.rotation || 0) * 2
                      ) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          rotation: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipHorizontal: !(
                              selectedNode.data?.right_sidebar
                                ?.flipHorizontal || false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipVertical: !(
                              selectedNode.data?.right_sidebar?.flipVertical ||
                              false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.right_sidebar?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: currentRotation + 90,
                          },
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Typography */}
            <PropertySection title="Typography">
              <PropertyRow label="Text">
                <TextInput
                  value={selectedNode.data?.right_sidebar?.text || "Text"}
                  onChange={(value) =>
                    updateNodeDataWithHug(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        text: value,
                      },
                    })
                  }
                  placeholder="Enter text"
                />
              </PropertyRow>

              <PropertyRow label="Font">
                <CustomSelect
                  options={[
                    { label: "Inter", value: "Inter" },
                    { label: "Arial", value: "Arial" },
                    { label: "Helvetica", value: "Helvetica" },
                    { label: "Times New Roman", value: "Times New Roman" },
                    { label: "Georgia", value: "Georgia" },
                    { label: "Verdana", value: "Verdana" },
                    { label: "Trebuchet MS", value: "Trebuchet MS" },
                    { label: "Courier New", value: "Courier New" },
                    { label: "Roboto", value: "Roboto" },
                    { label: "Open Sans", value: "Open Sans" },
                    { label: "Poppins", value: "Poppins" },
                    { label: "Montserrat", value: "Montserrat" },
                    { label: "Lato", value: "Lato" },
                    { label: "Source Sans Pro", value: "Source Sans Pro" },
                    { label: "Nunito", value: "Nunito" },
                    { label: "Raleway", value: "Raleway" },
                    { label: "Ubuntu", value: "Ubuntu" },
                    { label: "Playfair Display", value: "Playfair Display" },
                    { label: "Merriweather", value: "Merriweather" },
                    { label: "Oswald", value: "Oswald" },
                    { label: "PT Sans", value: "PT Sans" },
                    { label: "Libre Baskerville", value: "Libre Baskerville" },
                    { label: "Fira Sans", value: "Fira Sans" },
                    { label: "Work Sans", value: "Work Sans" },
                    { label: "DM Sans", value: "DM Sans" },
                  ]}
                  value={selectedNode.data?.right_sidebar?.font || "Inter"}
                  onChange={(value) =>
                    updateNodeDataWithHug(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        font: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Weight">
                <CustomSelect
                  options={[
                    { label: "100 - Thin", value: "100" },
                    { label: "200 - Extra Light", value: "200" },
                    { label: "300 - Light", value: "300" },
                    { label: "400 - Regular", value: "400" },
                    { label: "500 - Medium", value: "500" },
                    { label: "600 - Semi Bold", value: "600" },
                    { label: "700 - Bold", value: "700" },
                    { label: "800 - Extra Bold", value: "800" },
                    { label: "900 - Black", value: "900" },
                  ]}
                  value={selectedNode.data?.right_sidebar?.weight || "400"}
                  onChange={(value) =>
                    updateNodeDataWithHug(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        weight: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Size">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.fontSize || 16}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue > 0) {
                        updateNodeDataWithHug(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            fontSize: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={1}
                    max={200}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.fontSize || 16}
                    min={1}
                    max={200}
                    step={1}
                    onChange={(value) =>
                      updateNodeDataWithHug(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          fontSize: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Align">
                <ToggleButton
                  options={[
                    {
                      label: (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M1 2h6M1 4h4M1 6h5M1 8h3"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </svg>
                      ),
                      value: "left",
                    },
                    {
                      label: (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M3 2h6M4 4h4M3.5 6h5M4.5 8h3"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </svg>
                      ),
                      value: "center",
                    },
                    {
                      label: (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M5 2h6M7 4h4M6 6h5M8 8h3"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </svg>
                      ),
                      value: "right",
                    },
                  ]}
                  value={selectedNode.data?.right_sidebar?.align || "left"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        align: value,
                      },
                    })
                  }
                  onModeChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        type: value,
                      },
                    })
                  }
                />
                <Textarea
                  placeholder="Right sidebar"
                  value={selectedNode.data?.right_sidebar?.content || ""}
                  onChange={(content) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        content,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Spacing">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.letterSpacing || 0}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeDataWithHug(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            letterSpacing: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.1}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">L</span>
                  </div>
                </div>
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.lineSpacing || 1.2}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue > 0) {
                        updateNodeDataWithHug(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            lineSpacing: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.1}
                    min={0.1}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">H</span>
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>

            {/* Section 3: Style - Same as image node but with color picker instead of image picker */}
            <PropertySection title="Style">
              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Color">
                <ColorPicker
                  value={selectedNode.data?.right_sidebar?.color || "#FFFFFF"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        color: value,
                      },
                    })
                  }
                />
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      // Rectangle Node Controls
      case "rectangle-node": {
        // Check if rectangle node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for rectangle node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 200;
          const nodeHeight = selectedNode.data?.height || 200;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position - Same as image node */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Size">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.width || 200}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, { width: newValue });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    min={10}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">W</span>
                  </div>
                </div>
              </PropertyRow>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.height || 200}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          updateNodeData(selectedNode.id, { height: newValue });
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round(
                        (selectedNode.data?.right_sidebar?.rotation || 0) * 2
                      ) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          rotation: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipHorizontal: !(
                              selectedNode.data?.right_sidebar
                                ?.flipHorizontal || false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipVertical: !(
                              selectedNode.data?.right_sidebar?.flipVertical ||
                              false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.right_sidebar?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: currentRotation + 90,
                          },
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Style - Same as image node but with color picker instead of image picker */}
            <PropertySection title="Style">
              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Rive corn">
                <CustomSelect
                  options={[
                    { label: "All corners", value: "all" },
                    { label: "Top left", value: "topLeft" },
                    { label: "Top right", value: "topRight" },
                    { label: "Bottom left", value: "bottomLeft" },
                    { label: "Bottom right", value: "bottomRight" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.activeCorner ?? "all"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        activeCorner: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Corners">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 0) {
                        const activeCorner =
                          selectedNode.data?.right_sidebar?.activeCorner ??
                          "all";

                        if (activeCorner === "all") {
                          // Update all corners and the main cornerRadius
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              cornerRadius: newValue,
                              corners: {
                                topLeft: newValue,
                                topRight: newValue,
                                bottomLeft: newValue,
                                bottomRight: newValue,
                              },
                            },
                          });
                        } else {
                          // Update specific corner
                          const currentCorners =
                            selectedNode.data?.right_sidebar?.corners || {};
                          updateNodeData(selectedNode.id, {
                            right_sidebar: {
                              ...selectedNode.data?.right_sidebar,
                              corners: {
                                ...currentCorners,
                                [activeCorner]: newValue,
                              },
                            },
                          });
                        }
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={(() => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";
                      const corners =
                        selectedNode.data?.right_sidebar?.corners || {};

                      if (activeCorner === "all") {
                        return (
                          selectedNode.data?.right_sidebar?.cornerRadius ?? 8
                        );
                      } else {
                        return corners[activeCorner] ?? 8;
                      }
                    })()}
                    min={0}
                    max={250}
                    step={1}
                    onChange={(value) => {
                      const activeCorner =
                        selectedNode.data?.right_sidebar?.activeCorner ?? "all";

                      if (activeCorner === "all") {
                        // Update all corners and the main cornerRadius
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            cornerRadius: value,
                            corners: {
                              topLeft: value,
                              topRight: value,
                              bottomLeft: value,
                              bottomRight: value,
                            },
                          },
                        });
                      } else {
                        // Update specific corner
                        const currentCorners =
                          selectedNode.data?.right_sidebar?.corners || {};
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            corners: {
                              ...currentCorners,
                              [activeCorner]: value,
                            },
                          },
                        });
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </PropertyRow>
              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Fill">
                <ColorPicker
                  value={
                    selectedNode.data?.right_sidebar?.fillColor || "#007AFF"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        fillColor: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Stroke">
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value="Stroke"
                    readOnly
                    onClick={() => setShowStrokeOverlay(true)}
                    className={baseInputClasses + " cursor-pointer pr-8"}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Plus className="w-3 h-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      // Circle Node Controls
      case "circle-node": {
        // Check if circle node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for circle node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 200;
          const nodeHeight = selectedNode.data?.height || 200;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position - Same as rectangle node */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Size">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.width || 200}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, { width: newValue });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    min={10}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">W</span>
                  </div>
                </div>
              </PropertyRow>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.height || 200}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          updateNodeData(selectedNode.id, { height: newValue });
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round(
                        (selectedNode.data?.right_sidebar?.rotation || 0) * 2
                      ) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          rotation: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipHorizontal: !(
                              selectedNode.data?.right_sidebar
                                ?.flipHorizontal || false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipVertical: !(
                              selectedNode.data?.right_sidebar?.flipVertical ||
                              false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.right_sidebar?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: currentRotation + 90,
                          },
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Style - Same as rectangle node but WITHOUT corner radius */}
            <PropertySection title="Style">
              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              {/* NO CORNER RADIUS - circles don't have corners */}

              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Fill">
                <ColorPicker
                  value={
                    selectedNode.data?.right_sidebar?.fillColor || "#007AFF"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        fillColor: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Stroke">
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value="Stroke"
                    readOnly
                    onClick={() => setShowStrokeOverlay(true)}
                    className={baseInputClasses + " cursor-pointer pr-8"}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Plus className="w-3 h-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      // Star Node Controls
      case "star-node": {
        // Check if star node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for star node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 200;
          const nodeHeight = selectedNode.data?.height || 200;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position - Same as rectangle node */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.pin ? "true" : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        pin: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Size">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.width || 200}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, { width: newValue });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    min={10}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">W</span>
                  </div>
                </div>
              </PropertyRow>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={selectedNode.data?.height || 200}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          updateNodeData(selectedNode.id, { height: newValue });
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round(
                        (selectedNode.data?.right_sidebar?.rotation || 0) * 2
                      ) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          rotation: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipHorizontal: !(
                              selectedNode.data?.right_sidebar
                                ?.flipHorizontal || false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            flipVertical: !(
                              selectedNode.data?.right_sidebar?.flipVertical ||
                              false
                            ),
                          },
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.right_sidebar?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            rotation: currentRotation + 90,
                          },
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Style - Same as rectangle node PLUS 3 additional star properties */}
            <PropertySection title="Style">
              <PropertyRow label="Visibility">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "true" },
                    { label: <EyeClosedIcon />, value: "false" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.visibility !== false
                      ? "true"
                      : "false"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        visibility: value === "true",
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Opacity">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (
                        !isNaN(newValue) &&
                        newValue >= 0 &&
                        newValue <= 100
                      ) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            opacity: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.opacity ?? 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          opacity: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Corners">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.cornerRadius ?? 8}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 0) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            cornerRadius: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={0}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.cornerRadius ?? 8}
                    min={0}
                    max={250}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          cornerRadius: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              {/* STAR-SPECIFIC PROPERTIES - placed after Corners */}
              <PropertyRow label="Count">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.starCount || 5}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 3 && newValue <= 20) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            starCount: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={3}
                    max={20}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.starCount || 5}
                    min={3}
                    max={20}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          starCount: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Depth">
                <div className="w-full h-full">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.starAngle || 40}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue) && newValue >= 1 && newValue <= 99) {
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            starAngle: newValue,
                          },
                        });
                      }
                    }}
                    className={baseInputClasses}
                    min={1}
                    max={99}
                  />
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.starAngle || 40}
                    min={1}
                    max={99}
                    step={1}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          starAngle: value,
                        },
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Blend mode">
                <CustomSelect
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Multiply", value: "multiply" },
                    { label: "Screen", value: "screen" },
                    { label: "Overlay", value: "overlay" },
                    { label: "Darken", value: "darken" },
                    { label: "Lighten", value: "lighten" },
                    { label: "Color-dodge", value: "color-dodge" },
                    { label: "Color-burn", value: "color-burn" },
                    { label: "Hard-light", value: "hard-light" },
                    { label: "Soft-light", value: "soft-light" },
                    { label: "Difference", value: "difference" },
                    { label: "Exclusion", value: "exclusion" },
                  ]}
                  value={
                    selectedNode.data?.right_sidebar?.blendMode || "normal"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        blendMode: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Fill">
                <ColorPicker
                  value={
                    selectedNode.data?.right_sidebar?.fillColor || "#007AFF"
                  }
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        fillColor: value,
                      },
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Stroke">
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value="Stroke"
                    readOnly
                    onClick={() => setShowStrokeOverlay(true)}
                    className={baseInputClasses + " cursor-pointer pr-8"}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Plus className="w-3 h-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      // Comment Node Controls - Removed

      default:
        return renderSchemaBasedControls();
    }
  };

  const renderSchemaBasedControls = () => {
    if (!selectedNode?.data?.type) return null;

    const nodeType = selectedNode.data.type;

    // Check if normal node is a child of a frame
    const isChildOfFrame =
      selectedNode.parentId &&
      nodes.find((n) => n.id === selectedNode.parentId)?.type === "frame-node";

    // Enhanced alignment function for normal nodes
    const handleAlignment = (alignmentType: string) => {
      // Normal nodes don't have explicit width/height, so we'll use their DOM element dimensions
      const nodeElement = document.querySelector(
        `[data-id="${selectedNode.id}"]`
      );
      if (!nodeElement) return;

      const nodeRect = nodeElement.getBoundingClientRect();
      const viewport = getViewport();

      // Convert screen dimensions to flow coordinates by dividing by zoom
      const nodeWidth = nodeRect.width / viewport.zoom;
      const nodeHeight = nodeRect.height / viewport.zoom;

      let newX = selectedNode.position.x;
      let newY = selectedNode.position.y;

      if (isChildOfFrame) {
        // Frame-relative alignment (existing logic)
        const parentFrame = nodes.find((n) => n.id === selectedNode.parentId);
        if (!parentFrame) return;

        const frameWidth = (parentFrame.data?.width as number) || 400;
        const frameHeight = (parentFrame.data?.height as number) || 300;

        switch (alignmentType) {
          case "left":
            newX = 0;
            break;
          case "center-h": // horizontal center
            newX = (frameWidth - nodeWidth) / 2;
            break;
          case "right":
            newX = frameWidth - nodeWidth;
            break;
          case "top":
            newY = frameHeight - nodeHeight;
            break;
          case "center-v": // vertical center
            newY = (frameHeight - nodeHeight) / 2;
            break;
          case "bottom":
            newY = 0;
            break;
        }
      } else {
        // Canvas-relative alignment (new logic using ReactFlow viewport)
        const viewport = getViewport();
        const canvasElement = document.querySelector(".react-flow");
        if (!canvasElement) return;

        const canvasRect = canvasElement.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;

        // Calculate visible viewport bounds in flow coordinates
        const viewportLeft = -viewport.x / viewport.zoom;
        const viewportTop = -viewport.y / viewport.zoom;
        const viewportWidth = canvasWidth / viewport.zoom;
        const viewportHeight = canvasHeight / viewport.zoom;

        switch (alignmentType) {
          case "left":
            newX = viewportLeft;
            break;
          case "center-h": // horizontal center
            newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
            break;
          case "right":
            newX = viewportLeft + viewportWidth - nodeWidth;
            break;
          case "top":
            newY = viewportTop + viewportHeight - nodeHeight;
            break;
          case "center-v": // vertical center
            newY = viewportTop + (viewportHeight - nodeHeight) / 2;
            break;
          case "bottom":
            newY = viewportTop;
            break;
        }
      }

      // Update node position
      updateNodeData(selectedNode.id, {
        position: { x: newX, y: newY },
      });
    };

    switch (nodeType) {
      case "control-net-pose":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Pose - Show Rive component or preprocessed image based on connections */}
            <PropertySection title="Pose">
              {shouldShowPreprocessedImage(selectedNode.id) ? (
                // Show preprocessed ControlNet result when connected
                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    <div
                      className="flex-1 flex gap-1.5 justify-center items-center"
                      style={{ minHeight: "235px" }}
                    >
                      {selectedNode.data?.isPreprocessing ? (
                        // Show loading state during preprocessing
                        <div className="w-full h-full bg-[#151515] border border-[#1d1d1d] rounded-2xl flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF]"></div>
                          <span className="text-sm text-[#9e9e9e]">
                            Preprocessing...
                          </span>
                        </div>
                      ) : getProcessedImageForNode(selectedNode.id) ||
                        selectedNode.data?.hasPreprocessedImage ? (
                        // Show preprocessed image if available OR if hasPreprocessedImage flag is true
                        <ImagePreviewWithMode
                          src={(() => {
                            const mode =
                              selectedNode.data?.right_sidebar?.type ||
                              "source";
                            if (mode === "final map") {
                              // Final map mode: show the connected input image (fallback to image_input if no connection)
                              return (
                                getConnectedInputImageForNode(
                                  selectedNode.id
                                ) ||
                                selectedNode?.data?.right_sidebar?.image_input
                              );
                            } else {
                              // Source mode: show the preprocessed image (fallback to image_input if no preprocessing)
                              // Check for both property names to fix the mismatch issue
                              const processedUrl = getProcessedImageForNode(
                                selectedNode.id
                              );
                              const preprocessedUrl =
                                (selectedNode.data?.preprocessedImage as any)
                                  ?.guideImageURL ||
                                (selectedNode.data?.preprocessedImage as any)
                                  ?.imageURL;
                              const fallbackUrl =
                                selectedNode.data?.right_sidebar
                                  ?.preprocessedImage ||
                                selectedNode?.data?.right_sidebar?.image_input;

                              return (
                                processedUrl || preprocessedUrl || fallbackUrl
                              );
                            }
                          })()}
                          alt="Preprocessed Pose"
                          width={235}
                          height={235}
                          className="rounded-2xl z-50"
                          modeValue={
                            selectedNode.data?.right_sidebar?.type || "source"
                          }
                          onModeChange={(value) =>
                            updateNodeData(selectedNode.id, {
                              right_sidebar: {
                                ...selectedNode.data?.right_sidebar,
                                type: value,
                              },
                            })
                          }
                        />
                      ) : (
                        // Show waiting state only when connected but truly no processed image exists
                        <div className="w-full h-full bg-[#151515] border border-[#1d1d1d] rounded-2xl flex flex-col items-center justify-center gap-2">
                          <div className="animate-pulse rounded-full h-8 w-8 bg-[#333333]"></div>
                          <span className="text-sm text-[#9e9e9e]">
                            Waiting for preprocessing...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Show Rive component when no input connection
                <RiveInput key={selectedNode?.id} nodeType="pose" />
              )}

              {selectedNode.data?.right_sidebar?.type === "source" && (
                <>
                  <PropertyRow label="Source">
                    <CustomSelect
                      options={[
                        { label: "Image", value: "Image" },
                        { label: "Camera", value: "Camera" },
                        { label: "API", value: "API" },
                      ]}
                      value={
                        selectedNode.data?.right_sidebar?.source || "Image"
                      }
                      onChange={(value) =>
                        updateNodeData(selectedNode.id, {
                          right_sidebar: {
                            ...selectedNode.data?.right_sidebar,
                            source: value,
                          },
                        })
                      }
                    />
                  </PropertyRow>

                  <PropertyRow label="Map">
                    <PrimaryButton
                      onClick={() => toast.success("Map inserted into canvas")}
                      icon={Upload}
                    >
                      Insert in canvas
                    </PrimaryButton>
                  </PropertyRow>
                </>
              )}
            </PropertySection>

            {/* Section 3: Node */}
            <PropertySection title="Node">
              <PropertyRow label="Skip">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "false" },
                    { label: <EyeClosedIcon />, value: "true" },
                  ]}
                  value={selectedNode.data?.skip ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { skip: value === "true" })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Title">
                <DepthTextInputWithEmoji
                  value={selectedNode.data?.displayName || ""}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { displayName: value })
                  }
                  placeholder="Engine title"
                  selectedNodeId={selectedNode.id}
                  updateNodeData={updateNodeData}
                  currentIcon={selectedNode.data?.icon}
                />
              </PropertyRow>

              <PropertyRow label="Color">
                <ColorPicker
                  value={selectedNode.data?.iconBgColor || "Pink"}
                  onChange={(value) => {
                    const nodeStyle = selectedNode.data?.nodeStyle || "accent";
                    if (nodeStyle === "accent") {
                      updateNodeData(selectedNode.id, { iconBgColor: value });
                    } else {
                      // Fill mode: update both iconBgColor and nodeFillColor
                      updateNodeData(selectedNode.id, {
                        iconBgColor: value,
                        nodeFillColor: value,
                      });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Style">
                <ToggleButton
                  options={[
                    { label: "Accent", value: "accent" },
                    { label: "Fill", value: "fill" },
                  ]}
                  value={selectedNode.data?.nodeStyle || "accent"}
                  onChange={(value) => {
                    if (value === "fill") {
                      // When switching to fill mode, set nodeFillColor to current iconBgColor
                      const currentColor =
                        selectedNode.data?.iconBgColor || "Pink";
                      updateNodeData(selectedNode.id, {
                        nodeStyle: value,
                        nodeFillColor: currentColor,
                      });
                    } else {
                      // When switching to accent mode, just update nodeStyle
                      updateNodeData(selectedNode.id, { nodeStyle: value });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Shape">
                <ToggleButton
                  options={[
                    { label: <RectangleIcon />, value: "square" },
                    { label: <PillIcon />, value: "rectangle" },
                  ]}
                  value={selectedNode.data?.nodeShape || "rectangle"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { nodeShape: value })
                  }
                />
              </PropertyRow>
            </PropertySection>
          </>
        );

      case "control-net-edge":
      case "control-net-depth":
      case "control-net-segments":
      case "control-net-normal-map":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Edge */}
            <PropertySection title="Edge">
              {shouldShowPreprocessedImage(selectedNode.id) ? (
                // Show preprocessed ControlNet result when connected
                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    <div
                      className="flex-1 flex gap-1.5 justify-center items-center"
                      style={{ minHeight: "140px" }}
                    >
                      {selectedNode.data?.isPreprocessing ? (
                        // Show loading state during preprocessing
                        <div className="w-full h-full bg-[#151515] border border-[#1d1d1d] rounded-2xl flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007AFF]"></div>
                          <span className="text-xs text-[#9e9e9e]">
                            Preprocessing...
                          </span>
                        </div>
                      ) : getProcessedImageForNode(selectedNode.id) ||
                        selectedNode.data?.hasPreprocessedImage ? (
                        // Show preprocessed image if available OR if hasPreprocessedImage flag is true
                        <ImagePreviewWithMode
                          src={(() => {
                            const mode =
                              selectedNode.data?.right_sidebar?.type ||
                              "source";
                            if (mode === "final map") {
                              // Final map mode: show the connected input image (fallback to image_input if no connection)
                              return (
                                getConnectedInputImageForNode(
                                  selectedNode.id
                                ) ||
                                selectedNode?.data?.right_sidebar?.image_input
                              );
                            } else {
                              // Source mode: show the preprocessed image (fallback to image_input if no preprocessing)
                              // Check for both property names to fix the mismatch issue
                              const processedUrl = getProcessedImageForNode(
                                selectedNode.id
                              );
                              const preprocessedUrl =
                                (selectedNode.data?.preprocessedImage as any)
                                  ?.guideImageURL ||
                                (selectedNode.data?.preprocessedImage as any)
                                  ?.imageURL || // fallback if some path set this
                                selectedNode.data?.right_sidebar
                                  ?.preprocessedImage ||
                                selectedNode?.data?.right_sidebar?.image_input;

                              return processedUrl || preprocessedUrl;
                            }
                          })()}
                          alt="Control net preview"
                          className="mx-auto"
                          modeValue={
                            selectedNode.data?.right_sidebar?.type || "source"
                          }
                          onModeChange={(value) =>
                            updateNodeData(selectedNode.id, {
                              right_sidebar: {
                                ...selectedNode.data?.right_sidebar,
                                type: value,
                              },
                            })
                          }
                        />
                      ) : (
                        // Show waiting state only when connected but truly no processed image exists
                        <div className="w-full h-full bg-[#151515] border border-[#1d1d1d] rounded-2xl flex flex-col items-center justify-center gap-2">
                          <div className="animate-pulse rounded-full h-6 w-6 bg-[#333333]"></div>
                          <span className="text-xs text-[#9e9e9e]">
                            Waiting for preprocessing...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Show default image preview when no input connection
                <ImagePreviewWithMode
                  src={selectedNode?.data?.right_sidebar?.image_input}
                  alt="Control net preview"
                  className="mx-auto"
                  modeValue={selectedNode.data?.right_sidebar?.type || "source"}
                  onModeChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...selectedNode.data?.right_sidebar,
                        type: value,
                      },
                    })
                  }
                />
              )}
            </PropertySection>

            {/* Section 3: Node */}
            <PropertySection title="Node">
              <PropertyRow label="Skip">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "false" },
                    { label: <EyeClosedIcon />, value: "true" },
                  ]}
                  value={selectedNode.data?.skip ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { skip: value === "true" })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Title">
                <DepthTextInputWithEmoji
                  value={selectedNode.data?.displayName || ""}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { displayName: value })
                  }
                  placeholder="Engine title"
                  selectedNodeId={selectedNode.id}
                  updateNodeData={updateNodeData}
                  currentIcon={selectedNode.data?.icon}
                />
              </PropertyRow>

              <PropertyRow label="Color">
                <ColorPicker
                  value={selectedNode.data?.iconBgColor || "Pink"}
                  onChange={(value) => {
                    const nodeStyle = selectedNode.data?.nodeStyle || "accent";
                    if (nodeStyle === "accent") {
                      updateNodeData(selectedNode.id, { iconBgColor: value });
                    } else {
                      // Fill mode: update both iconBgColor and nodeFillColor
                      updateNodeData(selectedNode.id, {
                        iconBgColor: value,
                        nodeFillColor: value,
                      });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Style">
                <ToggleButton
                  options={[
                    { label: "Accent", value: "accent" },
                    { label: "Fill", value: "fill" },
                  ]}
                  value={selectedNode.data?.nodeStyle || "accent"}
                  onChange={(value) => {
                    if (value === "fill") {
                      // When switching to fill mode, set nodeFillColor to current iconBgColor
                      const currentColor =
                        selectedNode.data?.iconBgColor || "Pink";
                      updateNodeData(selectedNode.id, {
                        nodeStyle: value,
                        nodeFillColor: currentColor,
                      });
                    } else {
                      // When switching to accent mode, just update nodeStyle
                      updateNodeData(selectedNode.id, { nodeStyle: value });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Shape">
                <ToggleButton
                  options={[
                    { label: <RectangleIcon />, value: "square" },
                    { label: <PillIcon />, value: "rectangle" },
                  ]}
                  value={selectedNode.data?.nodeShape || "rectangle"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { nodeShape: value })
                  }
                />
              </PropertyRow>
            </PropertySection>
          </>
        );

      case "seed-image-lights": {
        // Check if lights node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for lights node
        const handleAlignment = (alignmentType: string) => {
          // Normal nodes don't have explicit width/height, so we'll use their DOM element dimensions
          const nodeElement = document.querySelector(
            `[data-id="${selectedNode.id}"]`
          );
          if (!nodeElement) return;

          const nodeRect = nodeElement.getBoundingClientRect();
          const viewport = getViewport();

          // Convert screen dimensions to flow coordinates by dividing by zoom
          const nodeWidth = nodeRect.width / viewport.zoom;
          const nodeHeight = nodeRect.height / viewport.zoom;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Lights - Rive preview component preserved as requested */}
            <PropertySection title="Lights">
              <PropertyRow label="Blend">
                <div className="flex-1">
                  <input
                    type="number"
                    value={selectedNode.data?.right_sidebar?.blend || 50}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          blend: val,
                        },
                      });
                    }}
                    className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ minHeight: "30px", height: "30px" }}
                  />
                </div>
                <div className="flex-1 flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.right_sidebar?.blend || 50}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) => {
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...selectedNode.data?.right_sidebar,
                          blend: val,
                        },
                      });
                    }}
                  />
                </div>
              </PropertyRow>
              <RiveInput key={selectedNode?.id} nodeType="lights" />
            </PropertySection>

            {/* Section 3: Node */}
            <PropertySection title="Node">
              <PropertyRow label="Skip">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "false" },
                    { label: <EyeClosedIcon />, value: "true" },
                  ]}
                  value={selectedNode.data?.skip ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { skip: value === "true" })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Title">
                <DepthTextInputWithEmoji
                  value={selectedNode.data?.displayName || ""}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { displayName: value })
                  }
                  placeholder="Engine title"
                  selectedNodeId={selectedNode.id}
                  updateNodeData={updateNodeData}
                  currentIcon={selectedNode.data?.icon}
                />
              </PropertyRow>

              <PropertyRow label="Color">
                <ColorPicker
                  value={selectedNode.data?.iconBgColor || "Pink"}
                  onChange={(value) => {
                    const nodeStyle = selectedNode.data?.nodeStyle || "accent";
                    if (nodeStyle === "accent") {
                      updateNodeData(selectedNode.id, { iconBgColor: value });
                    } else {
                      // Fill mode: update both iconBgColor and nodeFillColor
                      updateNodeData(selectedNode.id, {
                        iconBgColor: value,
                        nodeFillColor: value,
                      });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Style">
                <ToggleButton
                  options={[
                    { label: "Accent", value: "accent" },
                    { label: "Fill", value: "fill" },
                  ]}
                  value={selectedNode.data?.nodeStyle || "accent"}
                  onChange={(value) => {
                    if (value === "fill") {
                      // When switching to fill mode, set nodeFillColor to current iconBgColor
                      const currentColor =
                        selectedNode.data?.iconBgColor || "Pink";
                      updateNodeData(selectedNode.id, {
                        nodeStyle: value,
                        nodeFillColor: currentColor,
                      });
                    } else {
                      // When switching to accent mode, just update nodeStyle
                      updateNodeData(selectedNode.id, { nodeStyle: value });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Shape">
                <ToggleButton
                  options={[
                    { label: <RectangleIcon />, value: "square" },
                    { label: <PillIcon />, value: "rectangle" },
                  ]}
                  value={selectedNode.data?.nodeShape || "rectangle"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { nodeShape: value })
                  }
                />
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      case "control-net-reference": {
        // Check if reference node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for reference node
        const handleAlignment = (alignmentType: string) => {
          // Normal nodes don't have explicit width/height, so we'll use their DOM element dimensions
          const nodeElement = document.querySelector(
            `[data-id="${selectedNode.id}"]`
          );
          if (!nodeElement) return;

          const nodeRect = nodeElement.getBoundingClientRect();
          const viewport = getViewport();

          // Convert screen dimensions to flow coordinates by dividing by zoom
          const nodeWidth = nodeRect.width / viewport.zoom;
          const nodeHeight = nodeRect.height / viewport.zoom;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 2: Reference */}
            <PropertySection title="Reference">
              <PropertyRow label="Type">
                <CustomSelect
                  options={[
                    { label: "Source", value: "source" },
                    { label: "Final Map", value: "final map" },
                  ]}
                  value={selectedNode.data?.type || "source"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { type: value })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Power">
                <NumericInput
                  value={selectedNode.data?.power || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { power: value })
                  }
                  min={0}
                  max={100}
                  step={1}
                />
              </PropertyRow>
            </PropertySection>

            {/* Section 3: Node */}
            <PropertySection title="Node">
              <PropertyRow label="Skip">
                <ToggleButton
                  options={[
                    { label: <EyeOpenIcon />, value: "false" },
                    { label: <EyeClosedIcon />, value: "true" },
                  ]}
                  value={selectedNode.data?.skip ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { skip: value === "true" })
                  }
                />
              </PropertyRow>

              <PropertyRow label="Title">
                <DepthTextInputWithEmoji
                  value={selectedNode.data?.displayName || ""}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { displayName: value })
                  }
                  placeholder="Engine title"
                  selectedNodeId={selectedNode.id}
                  updateNodeData={updateNodeData}
                  currentIcon={selectedNode.data?.icon}
                />
              </PropertyRow>

              <PropertyRow label="Color">
                <ColorPicker
                  value={selectedNode.data?.iconBgColor || "Pink"}
                  onChange={(value) => {
                    const nodeStyle = selectedNode.data?.nodeStyle || "accent";
                    if (nodeStyle === "accent") {
                      updateNodeData(selectedNode.id, { iconBgColor: value });
                    } else {
                      // Fill mode: update both iconBgColor and nodeFillColor
                      updateNodeData(selectedNode.id, {
                        iconBgColor: value,
                        nodeFillColor: value,
                      });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Style">
                <ToggleButton
                  options={[
                    { label: "Accent", value: "accent" },
                    { label: "Fill", value: "fill" },
                  ]}
                  value={selectedNode.data?.nodeStyle || "accent"}
                  onChange={(value) => {
                    if (value === "fill") {
                      // When switching to fill mode, set nodeFillColor to current iconBgColor
                      const currentColor =
                        selectedNode.data?.iconBgColor || "Pink";
                      updateNodeData(selectedNode.id, {
                        nodeStyle: value,
                        nodeFillColor: currentColor,
                      });
                    } else {
                      // When switching to accent mode, just update nodeStyle
                      updateNodeData(selectedNode.id, { nodeStyle: value });
                    }
                  }}
                />
              </PropertyRow>

              <PropertyRow label="Shape">
                <ToggleButton
                  options={[
                    { label: <RectangleIcon />, value: "square" },
                    { label: <PillIcon />, value: "rectangle" },
                  ]}
                  value={selectedNode.data?.nodeShape || "rectangle"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { nodeShape: value })
                  }
                />
              </PropertyRow>
            </PropertySection>
          </>
        );
      }

      case "image-to-image-re-imagine":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderSlider("Creativity", "creativity", 0, 100, 1)}
            {renderNodeDesignInput()}
          </>
        );

      case "image-to-image-reangle":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderNumericInput("Angle X", "angle.x", -180, 180, 1)}
            {renderNumericInput("Angle Y", "angle.y", -180, 180, 1)}
            {renderNumericInput("Angle Z", "angle.z", -180, 180, 1)}
            {renderNodeDesignInput()}
          </>
        );

      case "input-text": {
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderTextArea("Prompt", "prompt", "Enter your prompt here...")}
            {renderTextArea(
              "Negative Prompt",
              "negative",
              "Enter negative prompt here..."
            )}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedNode.data.enhance || false}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, {
                      enhance: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Enhance</span>
              </label>
            </div>
            {renderNodeDesignInput()}
          </>
        );
      }

      case "preview-image":
      case "preview-realtime": {
        // Check if preview node is a child of a frame
        const isChildOfFrame =
          selectedNode.parentId &&
          nodes.find((n) => n.id === selectedNode.parentId)?.type ===
            "frame-node";

        // Enhanced alignment function for preview node
        const handleAlignment = (alignmentType: string) => {
          const nodeWidth = selectedNode.data?.width || 300;
          const nodeHeight = selectedNode.data?.height || 300;

          let newX = selectedNode.position.x;
          let newY = selectedNode.position.y;

          if (isChildOfFrame) {
            // Frame-relative alignment (existing logic)
            const parentFrame = nodes.find(
              (n) => n.id === selectedNode.parentId
            );
            if (!parentFrame) return;

            const frameWidth = (parentFrame.data?.width as number) || 400;
            const frameHeight = (parentFrame.data?.height as number) || 300;

            switch (alignmentType) {
              case "left":
                newX = 0;
                break;
              case "center-h": // horizontal center
                newX = (frameWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = frameWidth - nodeWidth;
                break;
              case "top":
                newY = frameHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = (frameHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = 0;
                break;
            }
          } else {
            // Canvas-relative alignment (new logic using ReactFlow viewport)
            const viewport = getViewport();
            const canvasElement = document.querySelector(".react-flow");
            if (!canvasElement) return;

            const canvasRect = canvasElement.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;

            // Calculate visible viewport bounds in flow coordinates
            const viewportLeft = -viewport.x / viewport.zoom;
            const viewportTop = -viewport.y / viewport.zoom;
            const viewportWidth = canvasWidth / viewport.zoom;
            const viewportHeight = canvasHeight / viewport.zoom;

            switch (alignmentType) {
              case "left":
                newX = viewportLeft;
                break;
              case "center-h": // horizontal center
                newX = viewportLeft + (viewportWidth - nodeWidth) / 2;
                break;
              case "right":
                newX = viewportLeft + viewportWidth - nodeWidth;
                break;
              case "top":
                newY = viewportTop + viewportHeight - nodeHeight;
                break;
              case "center-v": // vertical center
                newY = viewportTop + (viewportHeight - nodeHeight) / 2;
                break;
              case "bottom":
                newY = viewportTop;
                break;
            }
          }

          // Update node position
          updateNodeData(selectedNode.id, {
            position: { x: newX, y: newY },
          });
        };

        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      pin: value === "true",
                    })
                  }
                />
              </PropertyRow>

              {/* Container with lock button */}
              <div className="flex items-center relative">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">
                  Container
                </label>

                {/* Top rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "15px",
                    borderTopLeftRadius: "6px",
                    borderTop: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                {/* Lock button positioned at exact coordinates */}
                <LockButton
                  isLocked={selectedNode.data?.aspectRatioLocked || false}
                  onToggle={(newLocked) => {
                    // Store current aspect ratio when locking
                    if (newLocked) {
                      const currentWidth = selectedNode.data?.width || 300;
                      const currentHeight = selectedNode.data?.height || 300;
                      const aspectRatio = currentWidth / currentHeight;

                      updateNodeData(selectedNode.id, {
                        aspectRatioLocked: newLocked,
                        storedAspectRatio: aspectRatio,
                      });
                    } else {
                      updateNodeData(selectedNode.id, {
                        aspectRatioLocked: newLocked,
                      });
                    }
                  }}
                  style={{
                    left: "64px",
                    top: "28px",
                  }}
                />

                {/* Bottom rounded corner line - always visible */}
                <div
                  className="absolute w-[10px] h-[10px]"
                  style={{
                    left: "71px",
                    top: "45px",
                    borderBottomLeftRadius: "6px",
                    borderBottom: "1px solid #333333",
                    borderLeft: "1px solid #333333",
                  }}
                />

                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.width || 300) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked = selectedNode.data?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newHeight = newValue / storedRatio;
                            const updateData = {
                              width: newValue,
                              height: newHeight,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newValue + 0.1,
                                height: newHeight + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only width when unlocked
                            const updateData = { width: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { width: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">W</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0"></div>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <div className="relative w-full h-full">
                    <input
                      type="number"
                      value={
                        Math.round((selectedNode.data?.height || 300) * 2) / 2
                      }
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue)) {
                          const isLocked = selectedNode.data?.aspectRatioLocked;
                          const storedRatio =
                            selectedNode.data?.storedAspectRatio;

                          if (isLocked && storedRatio) {
                            // Update both width and height to maintain aspect ratio
                            const newWidth = newValue * storedRatio;
                            const updateData = {
                              width: newWidth,
                              height: newValue,
                            };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = {
                                width: newWidth + 0.1,
                                height: newValue + 0.1,
                              };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          } else {
                            // Update only height when unlocked
                            const updateData = { height: newValue };
                            // Workaround: Update twice with slightly different values to force edge repositioning
                            updateNodeData(selectedNode.id, updateData);
                            setTimeout(() => {
                              const nudgedData = { height: newValue + 0.1 };
                              updateNodeData(selectedNode.id, nudgedData);
                            }, 2);
                          }
                        }
                      }}
                      className={baseInputClasses + " pr-6"}
                      min={10}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <span className="text-sm text-[#9e9e9e]">H</span>
                    </div>
                  </div>
                </div>
              </div>

              <PropertyRow label="Rotation">
                <div className="relative w-full h-full">
                  <input
                    type="number"
                    value={
                      Math.round((selectedNode.data?.rotation || 0) * 2) / 2
                    }
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        updateNodeData(selectedNode.id, {
                          rotation: newValue,
                        });
                      }
                    }}
                    className={baseInputClasses + " pr-6"}
                    step={0.5}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-sm text-[#9e9e9e]">°</span>
                  </div>
                </div>
                <div className="w-full h-full flex items-center">
                  <CustomSlider
                    value={selectedNode.data?.rotation || 0}
                    min={-180}
                    max={180}
                    step={0.5}
                    onChange={(value) =>
                      updateNodeData(selectedNode.id, {
                        rotation: value,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </PropertyRow>

              <PropertyRow label="Transform">
                <ButtonsBox
                  buttons={[
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M8 2L6 4H10L8 2Z" fill="currentColor" />
                          <path d="M8 14L10 12H6L8 14Z" fill="currentColor" />
                          <path d="M2 6V10H4V6H2Z" fill="currentColor" />
                          <path d="M12 6V10H14V6H12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          flipHorizontal: !(
                            selectedNode.data?.flipHorizontal || false
                          ),
                        });
                      },
                      tooltip: "Flip Horizontally",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path d="M2 8L4 6V10L2 8Z" fill="currentColor" />
                          <path d="M14 8L12 10V6L14 8Z" fill="currentColor" />
                          <path d="M6 2H10V4H6V2Z" fill="currentColor" />
                          <path d="M6 12H10V14H6V12Z" fill="currentColor" />
                        </svg>
                      ),
                      onClick: () => {
                        updateNodeData(selectedNode.id, {
                          flipVertical: !(
                            selectedNode.data?.flipVertical || false
                          ),
                        });
                      },
                      tooltip: "Flip Vertically",
                    },
                    {
                      icon: (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 2C5.79 2 4 3.79 4 6H2L4.5 8.5L7 6H5C5 4.34 6.34 3 8 3S11 4.34 11 6H13C13 3.79 11.21 2 8 2Z"
                            fill="currentColor"
                          />
                          <path
                            d="M8 14C10.21 14 12 12.21 12 10H14L11.5 7.5L9 10H11C11 11.66 9.66 13 8 13S5 11.66 5 10H3C3 12.21 4.79 14 8 14Z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                      onClick: () => {
                        const currentRotation =
                          selectedNode.data?.rotation || 0;

                        updateNodeData(selectedNode.id, {
                          rotation: currentRotation + 90,
                        });
                      },
                      tooltip: "Rotate 90°",
                    },
                  ]}
                />
              </PropertyRow>
            </PropertySection>

            {/* Image Output Section */}
            <PropertySection title="Image output">
              {/* View toggle */}
              <PropertyRow label="View">
                <ToggleButton
                  options={[
                    {
                      label: (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                          <circle
                            cx="8.5"
                            cy="8.5"
                            r="1.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                          <path
                            d="M21 15l-5-5L5 21l5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                        </svg>
                      ),
                      value: "image",
                    },
                    {
                      label: (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="16"
                            rx="2"
                            ry="2"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                          <rect
                            x="7"
                            y="8"
                            width="4"
                            height="4"
                            rx="1"
                            ry="1"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                          />
                          <path
                            d="M15 8h2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M15 12h2"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      ),
                      value: "card",
                    },
                  ]}
                  value={selectedNode.data?.viewMode || "card"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { viewMode: value })
                  }
                />
              </PropertyRow>

              {/* Title without emoji picker */}
              <PropertyRow label="Title">
                <TextInput
                  value={selectedNode.data?.displayName || "Image Output"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { displayName: value })
                  }
                  placeholder="Image output title"
                />
              </PropertyRow>
            </PropertySection>

            {/* Export Section */}
            <PropertySection title="Export">
              {/* Render toggle */}
              <PropertyRow label="Render">
                <ToggleButton
                  options={[
                    { label: "Image", value: "image" },
                    { label: "Container", value: "container" },
                  ]}
                  value={selectedNode.data?.exportRender || "image"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { exportRender: value })
                  }
                />
              </PropertyRow>

              {/* Format dropdown */}
              <PropertyRow label="Format">
                <CustomSelect
                  options={[
                    { label: "PNG", value: "png" },
                    { label: "JPEG", value: "jpeg" },
                    { label: "WEBP", value: "webp" },
                  ]}
                  value={selectedNode.data?.exportFormat || "png"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { exportFormat: value })
                  }
                />
              </PropertyRow>

              {/* Export button */}
              <div className="w-full mt-2.5">
                <PrimaryButton
                  onClick={() => {
                    // TODO: Implement export functionality
                    console.log("Export clicked", {
                      render: selectedNode.data?.exportRender || "image",
                      format: selectedNode.data?.exportFormat || "png",
                    });
                  }}
                >
                  Export
                </PrimaryButton>
              </div>
            </PropertySection>
          </>
        );
      }

      case "engine-real":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderEngineInput()}
            {renderNodeDesignInput()}
          </>
        );

      case "gear-anime":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderGearInput()}
            {renderNodeDesignInput()}
          </>
        );
      case "gear-killua":
        return (
          <>
            {/* Section 1: Position */}
            <PropertySection title="Position" isFirst={true}>
              {/* Position alignment icons */}
              <div className="flex justify-between items-center bg-[#1a1a1a] rounded-full border border-[#1d1d1d] px-1.5">
                {[
                  "left",
                  "center-h",
                  "right",
                  "top",
                  "center-v",
                  "bottom",
                  "between-h",
                  "between-v",
                ].map((p) => {
                  // Disable between-h and between-v for now (distribute functionality)
                  const isDisabled = p === "between-h" || p === "between-v";
                  const isEnabled = !isDisabled; // Always enabled for basic alignment

                  return (
                    <span
                      key={p}
                      className={`inline-flex p-2 rounded-full transition ${
                        isEnabled
                          ? "hover:bg-[#333333] cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      onClick={() => isEnabled && handleAlignment(p)}
                    >
                      <SvgIcon
                        name={`positions/${p}`}
                        className="w-5 h-5"
                        style={{
                          color: "#007AFF",
                          opacity: isEnabled ? 1 : 0.4,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              <PropertyRow label="Location">
                <PositionInput
                  value={selectedNode.position?.x || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, x: value },
                    })
                  }
                  label="X"
                />
                <PositionInput
                  value={selectedNode.position?.y || 0}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, {
                      position: { ...selectedNode.position, y: value },
                    })
                  }
                  label="Y"
                />
              </PropertyRow>

              <PropertyRow label="Pin">
                <ToggleButton
                  options={[
                    { label: "No", value: "false" },
                    { label: "Yes", value: "true" },
                  ]}
                  value={selectedNode.data?.pin ? "true" : "false"}
                  onChange={(value) =>
                    updateNodeData(selectedNode.id, { pin: value === "true" })
                  }
                />
              </PropertyRow>
            </PropertySection>
            {renderGearInput()}
            {renderNodeDesignInput()}
          </>
        );

      default:
        return (
          <p className="text-sm text-gray-500">
            Select a node to view and edit its properties.
          </p>
        );
    }
  };

  // If no node is selected but an edge is selected
  const renderEdgeControls = () => {
    if (!selectedEdge) return null;

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Edge Properties</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteEdge(selectedEdge.id)}
          >
            <Trash className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>

        <p className="text-sm text-gray-400 mb-2">
          Source: {selectedEdge.source}
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Target: {selectedEdge.target}
        </p>
      </div>
    );
  };

  // Helper function to get node color
  const getNodeColor = () => {
    if (!selectedNode?.data) return "#666666";

    // If node has color property in its data
    if (
      selectedNode.data.color &&
      typeof selectedNode.data.color === "string"
    ) {
      return selectedNode.data.color;
    }

    // Or determine by node type
    switch (selectedNode.type) {
      case "modelNode":
        return "#8000ff";
      case "loraNode":
        return "#9370db";
      case "controlnetNode":
        return "#4CAF50";
      case "inputNode":
        return "#FFD700";
      case "previewNode":
        return "#f59e0b";
      default:
        return "#666666";
    }
  };

  // Empty state when nothing is selected - shows Flows section
  const renderEmptyState = () => {
    console.log("DEBUG: renderEmptyState called");
    const workflows = detectWorkflows();
    console.log("DEBUG: workflows in renderEmptyState:", workflows);

    return (
      <div style={{ padding: "16px" }}>
        <PropertySection title="Flows" isFirst={true}>
          {workflows.length === 0 ? (
            <div className="text-sm text-[#9e9e9e] text-center py-4"></div>
          ) : (
            workflows.map((workflow, index) => (
              <PropertyRow key={index} label={workflow.name}>
                <div className="relative w-full h-full">
                  <input
                    type="text"
                    value={
                      workflow.engineNode?.data?.displayName ||
                      workflow.engineNode?.type ||
                      "Node"
                    }
                    readOnly
                    className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 pl-8 text-sm text-white outline-none cursor-pointer"
                    style={{ minHeight: "30px", height: "30px" }}
                    onClick={() => {
                      console.log(
                        "DEBUG: Flow clicked, engineNode:",
                        workflow.engineNode
                      );
                      if (workflow.engineNode) {
                        console.log(
                          "DEBUG: Selecting node:",
                          workflow.engineNode.id
                        );
                        // Try both methods to ensure node selection
                        setSelectedNode(workflow.engineNode);
                        setSelectedNodeById(workflow.engineNode);
                      } else {
                        console.log("DEBUG: No engine node found in workflow");
                      }
                    }}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <SvgIcon name="engine" className="h-3 w-3 text-[#9e9e9e]" />
                  </div>
                </div>
              </PropertyRow>
            ))
          )}
        </PropertySection>
      </div>
    );
  };

  // Main render
  return (
    <div
      className={
        selectedNode
          ? "w-[265px] h-full bg-[#0d0d0d] border-l border-[#1d1d1d] flex flex-col overflow-hidden"
          : "w-[265px] h-full bg-[#0d0d0d] border-l border-[#1d1d1d]"
      }
    >
      {/* Properties panel */}
      <ScrollArea className="h-[calc(100vh-80px)] overflow-y-auto">
        {selectedNode ? (
          <div style={{ padding: "16px" }}>
            {/* Node header - HIDDEN */}
            <div className="hidden flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: getNodeColor() }}
                />
                <h2
                  className="text-lg font-medium text-white truncate "
                  title={
                    selectedNode.data?.displayName &&
                    typeof selectedNode.data.displayName === "string"
                      ? selectedNode.data.displayName
                      : selectedNode.id
                  }
                >
                  {selectedNode.data?.displayName &&
                  typeof selectedNode.data.displayName === "string"
                    ? selectedNode.data.displayName
                    : selectedNode.id}
                </h2>
              </div>

              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copySelectedNode()}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy node</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => deleteSelectedNode()}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete node</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Type and ID info - HIDDEN */}
            <div className="hidden mb-4 text-xs text-gray-500">
              <p>Type: {selectedNode.type}</p>
              <p>ID: {selectedNode.id}</p>
            </div>

            {/* Node-specific controls */}
            <div>{renderNodeSpecificControls()}</div>
          </div>
        ) : selectedEdge ? (
          renderEdgeControls()
        ) : (
          renderEmptyState()
        )}
      </ScrollArea>

      {/* Stroke Settings Overlay */}
      {selectedNode && (
        <StrokeOverlay
          isOpen={showStrokeOverlay}
          onClose={() => setShowStrokeOverlay(false)}
          strokeColor={
            selectedNode.data?.right_sidebar?.strokeColor || "#FFFFFF"
          }
          strokeWidth={selectedNode.data?.right_sidebar?.strokeWidth || 0}
          strokeStyle={selectedNode.data?.right_sidebar?.strokeStyle || "solid"}
          onStrokeColorChange={(color) =>
            updateNodeData(selectedNode.id, {
              right_sidebar: {
                ...selectedNode.data?.right_sidebar,
                strokeColor: color,
              },
            })
          }
          onStrokeWidthChange={(width) =>
            updateNodeData(selectedNode.id, {
              right_sidebar: {
                ...selectedNode.data?.right_sidebar,
                strokeWidth: width,
              },
            })
          }
          onStrokeStyleChange={(style) =>
            updateNodeData(selectedNode.id, {
              right_sidebar: {
                ...selectedNode.data?.right_sidebar,
                strokeStyle: style,
              },
            })
          }
        />
      )}
    </div>
  );
};

export default RightSidebar;
