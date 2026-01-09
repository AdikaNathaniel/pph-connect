import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

// Preset colors for consistency
const PRESET_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Light Gray', hex: '#d1d5db' },
];

// Storage key for recent colors
const RECENT_COLORS_KEY = 'maestro-recent-colors';

// Get recent colors from localStorage
const getRecentColors = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save color to recent colors (max 6)
const saveRecentColor = (color: string): void => {
  try {
    const recent = getRecentColors();
    // Remove if already exists
    const filtered = recent.filter(c => c.toLowerCase() !== color.toLowerCase());
    // Add to beginning
    const updated = [color, ...filtered].slice(0, 6);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Validate hex color
const isValidHex = (hex: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors());
  const [rgb, setRgb] = useState<{ r: number; g: number; b: number } | null>(
    hexToRgb(value) || { r: 59, g: 130, b: 246 }
  );

  // Update hex input when value changes
  useEffect(() => {
    setHexInput(value.toUpperCase());
    const rgbValue = hexToRgb(value);
    if (rgbValue) {
      setRgb(rgbValue);
    }
  }, [value]);

  // Update RGB when hex changes
  const handleHexChange = (newHex: string) => {
    setHexInput(newHex.toUpperCase());
    if (isValidHex(newHex)) {
      const rgbValue = hexToRgb(newHex);
      if (rgbValue) {
        setRgb(rgbValue);
        onChange(newHex);
      }
    }
  };

  // Handle preset color click
  const handlePresetClick = (hex: string) => {
    onChange(hex);
    saveRecentColor(hex);
    setRecentColors(getRecentColors());
  };

  // Handle recent color click
  const handleRecentClick = (hex: string) => {
    onChange(hex);
    saveRecentColor(hex);
    setRecentColors(getRecentColors());
  };

  // Handle native color input change
  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    onChange(newColor);
    saveRecentColor(newColor);
    setRecentColors(getRecentColors());
  };

  // Handle hex input blur (validate and apply)
  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      onChange(hexInput);
      saveRecentColor(hexInput);
      setRecentColors(getRecentColors());
    } else {
      // Reset to current value if invalid
      setHexInput(value.toUpperCase());
    }
  };

  // Handle RGB input changes
  const handleRgbChange = (component: 'r' | 'g' | 'b', val: number) => {
    const newRgb = { ...rgb! };
    newRgb[component] = Math.max(0, Math.min(255, val));
    setRgb(newRgb);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    onChange(newHex);
    setHexInput(newHex.toUpperCase());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-9 w-16 p-1 cursor-pointer border-2", className)}
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">Pick color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Native color picker */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Color Picker</Label>
            <Input
              type="color"
              value={value}
              onChange={handleColorInputChange}
              className="w-full h-32 cursor-pointer"
            />
          </div>

          {/* Hex Input */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Hex Code</Label>
            <Input
              type="text"
              value={hexInput}
              onChange={(e) => {
                let val = e.target.value.toUpperCase();
                // Add # if missing
                if (val && !val.startsWith('#')) {
                  val = '#' + val;
                }
                setHexInput(val);
                if (isValidHex(val)) {
                  handleHexChange(val);
                }
              }}
              onBlur={handleHexBlur}
              placeholder="#000000"
              className="font-mono"
              maxLength={7}
            />
          </div>

          {/* RGB Inputs */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">RGB</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">R</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb?.r || 0}
                  onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">G</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb?.g || 0}
                  onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">B</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb?.b || 0}
                  onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Preset Colors */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Preset Colors</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => handlePresetClick(preset.hex)}
                  className={cn(
                    "h-8 w-8 rounded border-2 transition-all hover:scale-110",
                    value.toLowerCase() === preset.hex.toLowerCase()
                      ? "border-foreground ring-2 ring-offset-2"
                      : "border-border hover:border-foreground"
                  )}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  <span className="sr-only">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Colors */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Recent Colors {recentColors.length > 0 && `(${recentColors.length}/6)`}
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {recentColors.length > 0 ? (
                recentColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => handleRecentClick(color)}
                    className={cn(
                      "h-8 w-8 rounded border-2 transition-all hover:scale-110",
                      value.toLowerCase() === color.toLowerCase()
                        ? "border-foreground ring-2 ring-offset-2"
                        : "border-border hover:border-foreground"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    <span className="sr-only">{color}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-6 text-xs text-muted-foreground text-center py-2">
                  No recent colors. Pick a color to add it here.
                </div>
              )}
              {/* Fill empty slots for consistent grid */}
              {recentColors.length > 0 && recentColors.length < 6 && 
                Array.from({ length: 6 - recentColors.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 w-8 rounded border-2 border-dashed border-muted" />
                ))
              }
            </div>
          </div>

          {/* Current Color Display */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Label className="text-xs text-muted-foreground">Selected:</Label>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded border border-border"
                style={{ backgroundColor: value }}
              />
              <span className="text-xs font-mono">{value.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

