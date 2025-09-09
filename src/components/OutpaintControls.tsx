import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Maximize2, Check, X } from 'lucide-react';

interface OutpaintControlsProps {
  onOutpaintSettings: (direction: 'up' | 'down' | 'left' | 'right' | 'all', amount: number) => void;
  onCancel: () => void;
  isOpen: boolean;
  initialDirection?: 'up' | 'down' | 'left' | 'right' | 'all';
  initialAmount?: number;
}

export const OutpaintControls: React.FC<OutpaintControlsProps> = ({
  onOutpaintSettings,
  onCancel,
  isOpen,
  initialDirection = 'all',
  initialAmount = 50
}) => {
  const [direction, setDirection] = useState<'up' | 'down' | 'left' | 'right' | 'all'>(initialDirection);
  const [amount, setAmount] = useState(initialAmount);

  const handleApply = () => {
    onOutpaintSettings(direction, amount);
  };

  if (!isOpen) return null;

  const directionOptions = [
    { value: 'up' as const, label: 'Up', icon: ArrowUp },
    { value: 'down' as const, label: 'Down', icon: ArrowDown },
    { value: 'left' as const, label: 'Left', icon: ArrowLeft },
    { value: 'right' as const, label: 'Right', icon: ArrowRight },
    { value: 'all' as const, label: 'All Sides', icon: Maximize2 }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 min-w-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg font-medium">Outpaint Settings</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-[#9e9e9e] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Direction Selection */}
        <div className="mb-6">
          <label className="text-white text-sm font-medium mb-3 block">
            Outpaint Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            {directionOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={direction === option.value ? 'default' : 'outline'}
                  onClick={() => setDirection(option.value)}
                  className="flex items-center gap-2 justify-start"
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Amount Slider */}
        <div className="mb-6">
          <label className="text-white text-sm font-medium mb-3 block">
            Outpaint Amount: {amount}px
          </label>
          <Slider
            value={[amount]}
            onValueChange={(value) => setAmount(value[0])}
            min={10}
            max={200}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[#9e9e9e] mt-1">
            <span>10px</span>
            <span>200px</span>
          </div>
        </div>

        {/* Preview Description */}
        <div className="mb-6 p-3 bg-[#2a2a2a] rounded border border-[#333333]">
          <p className="text-sm text-[#9e9e9e]">
            <strong className="text-white">Direction:</strong> {directionOptions.find(opt => opt.value === direction)?.label}
            <br />
            <strong className="text-white">Amount:</strong> {amount}px extension
            <br />
            <span className="text-xs">
              The image will be extended {direction === 'all' ? 'in all directions' : `towards the ${direction}`} by {amount} pixels.
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Apply Outpaint
          </Button>
        </div>
      </div>
    </div>
  );
};