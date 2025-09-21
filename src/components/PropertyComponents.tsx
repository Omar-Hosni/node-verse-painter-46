import React from 'react';
import { HexColorPicker } from 'react-colorful';

// Add slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: #007AFF;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }

  .slider::-moz-range-thumb {
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: #007AFF;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = sliderStyles;
    document.head.appendChild(styleSheet);
}

// Eye icons as stable components
export const EyeOpenIcon = React.memo(() => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
));

export const EyeClosedIcon = React.memo(() => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
));

export const RectangleIcon = React.memo(() => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <rect x="0.5" y="0.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
));

export const PillIcon = React.memo(() => (
    <svg width="15" height="8" viewBox="0 0 15 8" fill="none">
        <rect x="0.5" y="0.5" width="14" height="7" rx="3.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
));

// Base input styling
const baseInputClasses = "w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Base property row component - memoized to prevent re-renders
export const PropertyRow = React.memo(({ label, children, contentClassName, rowClassName }: { label: string; children: React.ReactNode; contentClassName?: string; rowClassName?: string }) => (
    <div className={`flex ${rowClassName ?? 'items-center'} mb-2.5`}>
        <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">{label}</label>
        <div className={`flex-1 flex gap-1.5 ${contentClassName ? contentClassName : 'h-[30px]'}`}>
            {children}
        </div>
    </div>
));

// Section container - memoized
export const PropertySection = React.memo(({ title, children, isFirst = false }: {
    title?: string;
    children: React.ReactNode;
    isFirst?: boolean
}) => (
    <div className={`w-full m-0 px-0 py-4 space-y-2.5 ${isFirst ? '' : 'border-t border-[#1d1d1d]'}`}>
        {title && (
            <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
        )}
        {children}
    </div>
));

// Text input component - memoized
export const TextInput = React.memo(({
    value,
    onChange,
    placeholder
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
    />
));

// Numeric input component - memoized with 0.5 rounding
export const NumericInput = React.memo(({
    value,
    onChange,
    min,
    max,
    step = 1
}: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) => {
    // Round to nearest 0.5 for display
    const roundToNearestHalf = (num: number) => Math.round(num * 2) / 2;
    const displayValue = roundToNearestHalf(value);

    return (
        <input
            type="number"
            value={displayValue}
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
        />
    );
});

// Toggle button component - memoized
export const ToggleButton = React.memo(({
    options,
    value,
    onChange
}: {
    options: { label: string | React.ReactNode; value: string }[];
    value: string;
    onChange: (value: string) => void;
}) => (
    <div className="flex bg-[#1a1a1a] rounded-full w-full h-full p-0.5">
        {options.map((option) => (
            <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`flex-1 h-full text-sm transition-all flex items-center justify-center rounded-full ${value === option.value
                    ? 'bg-[#333333] text-white'
                    : 'bg-[#2b2b2b] text-[#9e9e9e] hover:text-white'
                    }`}
            >
                {option.label}
            </button>
        ))}
    </div>
));

// Custom Select component - memoized
export const CustomSelect = React.memo(({
    options,
    value,
    onChange
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
}) => (
    <div className="relative w-full h-full">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none appearance-none cursor-pointer"
        >
            {options.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                    {option.label}
                </option>
            ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                <polygon points="1,1 7,1 4,4" fill="#9e9e9e" />
            </svg>
        </div>
    </div>
));

// Position input with X/Y tags - memoized
export const PositionInput = React.memo(({
    value,
    onChange,
    label
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
});

// Color picker component - stable and memoized
export const ColorPicker = React.memo(({
    value,
    onChange
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);

    // Color name to hex mapping
    const colorMap: Record<string, string> = {
        'Black': '#000000',
        'Blue': '#0066FF',
        'Green': '#00CC66',
        'Orange': '#FF6600',
        'Purple': '#9966FF',
        'Red': '#FF3333',
        'Pink': '#FF6699',
        'Cyan': '#00CCFF'
    };

    // Get hex value for display
    const hexValue = colorMap[value] || value || '#FF6699';

    // Handle click outside to close picker
    React.useEffect(() => {
        if (!showPicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [showPicker]);

    return (
        <div className="relative w-full h-full" ref={pickerRef}>
            <div className="flex items-center gap-1.5 w-full h-full">
                {/* Color ball with checkerboard pattern for transparency */}
                <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 relative overflow-hidden">
                    {/* Checkerboard pattern wrapper */}
                    <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                            backgroundColor: '#151515',
                            backgroundImage: `
                                linear-gradient(45deg, #797979 25%, transparent 25%), 
                                linear-gradient(-45deg, #797979 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #797979 75%), 
                                linear-gradient(-45deg, transparent 75%, #797979 75%)
                            `,
                            backgroundSize: '10px 10px',
                            backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                            border: '1px solid #1a1a1a'
                        }}
                    />
                    {/* Color overlay */}
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="absolute inset-0 w-full h-full rounded-full outline-none cursor-pointer"
                        style={{ 
                            backgroundColor: hexValue,
                            border: '1px solid #1a1a1a'
                        }}
                    />
                </div>

                <div className="flex-1 h-full min-w-0">
                    <input
                        type="text"
                        value={hexValue}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full h-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none"
                    />
                </div>
            </div>

            {showPicker && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] rounded-lg p-3 shadow-lg z-50">
                    <HexColorPicker color={hexValue} onChange={onChange} />
                    <button
                        onClick={() => setShowPicker(false)}
                        className="mt-2 w-full bg-[#2b2b2b] text-white text-sm py-1 px-2 rounded hover:bg-[#3b3b3b] transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
});

// Custom slider for use within PropertyRow - fills width
export const CustomSlider = React.memo(({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1
}: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) => (
    <>
        <div className="flex-1">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#1a1a1a] rounded-full appearance-none cursor-pointer slider"
                style={{
                    background: `linear-gradient(to right, #007AFF 0%, #007AFF ${((value - min) / (max - min)) * 100}%, #1a1a1a ${((value - min) / (max - min)) * 100}%, #1a1a1a 100%)`
                }}
            />
        </div>
        <div className="flex-1">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    if (!isNaN(newValue)) {
                        onChange(Math.min(Math.max(newValue, min), max));
                    }
                }}
                className={baseInputClasses}
            />
        </div>
    </>
));

// Slider component with numeric input - proper property anatomy
export const SliderWithInput = React.memo(({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) => (
    <div className="flex items-center mb-2.5">
        <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">{label}</label>
        <div className="flex-1 flex gap-1.5 h-[30px]">
            <CustomSlider
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
            />
        </div>
    </div>
));

// Font selector with Google Fonts
export const FontSelector = React.memo(({
    value,
    onChange
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const googleFonts = [
        'Inter',
        'Roboto',
        'Open Sans',
        'Lato',
        'Montserrat',
        'Oswald',
        'Source Sans Pro',
        'Raleway',
        'PT Sans',
        'Lora',
        'Merriweather',
        'Playfair Display',
        'Poppins',
        'Nunito',
        'Ubuntu',
        'Crimson Text',
        'Libre Baskerville',
        'Fira Sans',
        'Work Sans',
        'Noto Sans'
    ];

    return (
        <CustomSelect
            options={googleFonts.map(font => ({ label: font, value: font }))}
            value={value}
            onChange={onChange}
        />
    );
});

// Font weight selector
export const FontWeightSelector = React.memo(({
    value,
    onChange
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const weights = [
        { label: 'Thin', value: '100' },
        { label: 'Extra Light', value: '200' },
        { label: 'Light', value: '300' },
        { label: 'Regular', value: '400' },
        { label: 'Medium', value: '500' },
        { label: 'Semi Bold', value: '600' },
        { label: 'Bold', value: '700' },
        { label: 'Extra Bold', value: '800' },
        { label: 'Black', value: '900' }
    ];

    return (
        <CustomSelect
            options={weights}
            value={value}
            onChange={onChange}
        />
    );
});

// Text alignment toggle
export const TextAlignToggle = React.memo(({
    value,
    onChange
}: {
    value: 'left' | 'center' | 'right';
    onChange: (value: 'left' | 'center' | 'right') => void;
}) => {
    const AlignLeftIcon = () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="17" y1="10" x2="3" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="6" x2="3" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="14" x2="3" y2="14" stroke="currentColor" strokeWidth="2" />
            <line x1="17" y1="18" x2="3" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
    );

    const AlignCenterIcon = () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="10" x2="6" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="6" x2="3" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="14" x2="3" y2="14" stroke="currentColor" strokeWidth="2" />
            <line x1="18" y1="18" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
    );

    const AlignRightIcon = () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="21" y1="10" x2="7" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="6" x2="3" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="14" x2="3" y2="14" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="18" x2="7" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
    );

    return (
        <ToggleButton
            options={[
                { label: <AlignLeftIcon />, value: 'left' },
                { label: <AlignCenterIcon />, value: 'center' },
                { label: <AlignRightIcon />, value: 'right' }
            ]}
            value={value}
            onChange={onChange}
        />
    );
});

// Blend mode selector
export const BlendModeSelector = React.memo(({
    value,
    onChange
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const blendModes = [
        { label: 'Normal', value: 'normal' },
        { label: 'Multiply', value: 'multiply' },
        { label: 'Screen', value: 'screen' },
        { label: 'Overlay', value: 'overlay' },
        { label: 'Soft Light', value: 'soft-light' },
        { label: 'Hard Light', value: 'hard-light' },
        { label: 'Color Dodge', value: 'color-dodge' },
        { label: 'Color Burn', value: 'color-burn' },
        { label: 'Darken', value: 'darken' },
        { label: 'Lighten', value: 'lighten' },
        { label: 'Difference', value: 'difference' },
        { label: 'Exclusion', value: 'exclusion' }
    ];

    return (
        <CustomSelect
            options={blendModes}
            value={value}
            onChange={onChange}
        />
    );
});

// Buttons box component for transform actions
export const ButtonsBox = React.memo(({
    buttons
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
));

// Add display names for better debugging
PropertyRow.displayName = 'PropertyRow';
PropertySection.displayName = 'PropertySection';
TextInput.displayName = 'TextInput';
NumericInput.displayName = 'NumericInput';
ToggleButton.displayName = 'ToggleButton';
CustomSelect.displayName = 'CustomSelect';
PositionInput.displayName = 'PositionInput';
ColorPicker.displayName = 'ColorPicker';
CustomSlider.displayName = 'CustomSlider';
SliderWithInput.displayName = 'SliderWithInput';
FontSelector.displayName = 'FontSelector';
FontWeightSelector.displayName = 'FontWeightSelector';
TextAlignToggle.displayName = 'TextAlignToggle';
BlendModeSelector.displayName = 'BlendModeSelector';
ButtonsBox.displayName = 'ButtonsBox';
EyeOpenIcon.displayName = 'EyeOpenIcon';
EyeClosedIcon.displayName = 'EyeClosedIcon';
RectangleIcon.displayName = 'RectangleIcon';
PillIcon.displayName = 'PillIcon';